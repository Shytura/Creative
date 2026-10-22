import { normalizeName } from '../lib/misc';
import type { Place, PlaceDraft, Venue, VenueDraft, Visit } from '../model/entities';
import type { MnemoStore } from '../repositories';

/**
 * Domain operations spanning several repositories. They keep references consistent and are
 * independent of the storage backend.
 */

function sameRef(
  a: { osmId?: string | undefined; wikidataId?: string | undefined },
  b: { osmId?: string | undefined; wikidataId?: string | undefined },
) {
  return (!!a.osmId && a.osmId === b.osmId) || (!!a.wikidataId && a.wikidataId === b.wikidataId);
}

/** Returns an existing place matching by external id or name + country, or creates it. */
export async function ensurePlace(store: MnemoStore, draft: PlaceDraft): Promise<Place> {
  const places = await store.places.list();
  const name = normalizeName(draft.name);
  const match = places.find(
    (p) =>
      sameRef(p, draft) ||
      (normalizeName(p.name) === name && (p.countryCode ?? '') === (draft.countryCode ?? '')),
  );
  if (!match) return store.places.create(draft);
  if (!match.coords && draft.coords) return store.places.update(match.id, { coords: draft.coords });
  return match;
}

export async function ensureVenue(store: MnemoStore, draft: VenueDraft): Promise<Venue> {
  const venues = await store.venues.list();
  const name = normalizeName(draft.name);
  const match = venues.find(
    (v) => sameRef(v, draft) || (v.placeId === draft.placeId && normalizeName(v.name) === name),
  );
  return match ?? store.venues.create(draft);
}

export async function ensureVisit(
  store: MnemoStore,
  venueId: string,
  date: string,
): Promise<Visit> {
  const visits = await store.visits.list();
  return (
    visits.find((v) => v.venueId === venueId && v.date === date) ??
    store.visits.create({ venueId, date })
  );
}

export async function removeArtwork(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    const artwork = await store.artworks.get(id);
    if (!artwork) return;
    for (const c of await store.collections.list()) {
      if (c.artworkIds.includes(id)) {
        await store.collections.update(c.id, {
          artworkIds: c.artworkIds.filter((a) => a !== id),
          coverArtworkId: c.coverArtworkId === id ? undefined : c.coverArtworkId,
        });
      }
    }
    for (const mediaId of artwork.mediaIds) await store.media.delete(mediaId);
    await store.artworks.delete(id);
  });
}

export async function removeVisit(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    const visit = await store.visits.get(id);
    if (!visit) return;
    for (const a of await store.artworks.list()) {
      if (a.visitId === id) await store.artworks.update(a.id, { visitId: undefined });
    }
    for (const mediaId of visit.mediaIds) await store.media.delete(mediaId);
    await store.visits.delete(id);
  });
}

export async function removeVenue(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    for (const visit of await store.visits.list()) {
      if (visit.venueId === id) await removeVisit(store, visit.id);
    }
    for (const a of await store.artworks.list()) {
      if (a.venueId === id) await store.artworks.update(a.id, { venueId: undefined });
    }
    for (const trip of await store.trips.list()) {
      if (trip.items.some((i) => i.venueId === id)) {
        await store.trips.update(trip.id, {
          items: trip.items.map((i) => (i.venueId === id ? { ...i, venueId: undefined } : i)),
        });
      }
    }
    await store.venues.delete(id);
  });
}

export async function removePlace(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    for (const venue of await store.venues.list()) {
      if (venue.placeId === id) await removeVenue(store, venue.id);
    }
    for (const trip of await store.trips.list()) {
      if (trip.placeIds.includes(id) || trip.items.some((i) => i.placeId === id)) {
        await store.trips.update(trip.id, {
          placeIds: trip.placeIds.filter((p) => p !== id),
          items: trip.items.map((i) => (i.placeId === id ? { ...i, placeId: undefined } : i)),
        });
      }
    }
    const place = await store.places.get(id);
    if (place?.coverMediaId) await store.media.delete(place.coverMediaId);
    await store.places.delete(id);
  });
}

export async function toggleInCollection(
  store: MnemoStore,
  collectionId: string,
  artworkId: string,
): Promise<void> {
  const collection = await store.collections.get(collectionId);
  if (!collection) return;
  const has = collection.artworkIds.includes(artworkId);
  await store.collections.update(collectionId, {
    artworkIds: has
      ? collection.artworkIds.filter((id) => id !== artworkId)
      : [...collection.artworkIds, artworkId],
  });
}

/**
 * Marks a trip item as done. With a date the item becomes a real visit: a venue is created
 * (or reused) in the item's place and a visit is recorded.
 */
export async function completeTripItem(
  store: MnemoStore,
  tripId: string,
  itemId: string,
  date?: string,
): Promise<{ venue?: Venue; visit?: Visit }> {
  return store.transaction(async () => {
    const trip = await store.trips.get(tripId);
    const item = trip?.items.find((i) => i.id === itemId);
    if (!trip || !item) throw new Error(`Trip item ${itemId} not found`);

    let venue: Venue | undefined;
    let visit: Visit | undefined;
    if (date) {
      const placeId = item.placeId ?? trip.placeIds[0];
      if (!placeId) throw new Error('Trip item has no place to attach the visit to');
      venue = item.venueId
        ? await store.venues.get(item.venueId)
        : await ensureVenue(store, {
            placeId,
            name: item.name,
            kind: item.kind,
            coords: item.coords,
            website: item.website,
            description: item.description,
            imageUrl: item.imageUrl,
            osmId: item.osmId,
            wikidataId: item.wikidataId,
            wikipedia: item.wikipedia,
          });
      if (venue) visit = await ensureVisit(store, venue.id, date);
    }

    await store.trips.update(tripId, {
      items: trip.items.map((i) =>
        i.id === itemId ? { ...i, done: true, venueId: venue?.id ?? i.venueId } : i,
      ),
    });
    return { venue, visit };
  });
}
