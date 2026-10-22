import {
  completeTripItem,
  createId,
  ensurePlace,
  ensureVenue,
  ensureVisit,
  removeArtwork,
  removePlace,
  toggleInCollection,
} from '@mnemo/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDexieStore, type DexieStore } from '../src';

let store: DexieStore;

beforeEach(() => {
  store = createDexieStore(`test-${createId()}`);
});

afterEach(async () => {
  await store.db.delete();
});

async function seedVienna() {
  const place = await store.places.create({
    name: 'Wien',
    countryCode: 'AT',
    country: 'Österreich',
  });
  const venue = await store.venues.create({ placeId: place.id, name: 'Albertina' });
  return { place, venue };
}

describe('entity repositories', () => {
  it('creates entities with metadata and defaults', async () => {
    const { place } = await seedVienna();
    expect(place.id).toBeTruthy();
    expect(place.notes).toBe('');
    expect(place.createdAt).toBe(place.updatedAt);
    expect(await store.places.list()).toHaveLength(1);
  });

  it('validates drafts', async () => {
    await expect(store.places.create({ name: '' })).rejects.toThrow();
    await expect(store.visits.create({ venueId: 'x', date: 'gestern' })).rejects.toThrow();
  });

  it('updates and clears optional fields', async () => {
    const { venue } = await seedVienna();
    const artwork = await store.artworks.create({ title: 'Feldhase', venueId: venue.id });
    const updated = await store.artworks.update(artwork.id, { venueId: undefined, favorite: true });
    expect(updated.venueId).toBeUndefined();
    expect(updated.favorite).toBe(true);
    expect(updated.createdAt).toBe(artwork.createdAt);
  });

  it('throws on updates of unknown ids', async () => {
    await expect(store.places.update('nope', { name: 'x' })).rejects.toThrow(/not found/);
  });
});

describe('media', () => {
  it('stores blobs separately and falls back between variants', async () => {
    const full = new Blob(['full-image'], { type: 'image/jpeg' });
    const media = await store.media.create({ mime: 'image/jpeg', width: 10, height: 10 }, { full });
    expect(media.hasBlob).toBe(true);
    expect(await (await store.media.getBlob(media.id, 'thumb'))?.text()).toBe('full-image');
    expect(await store.media.usage()).toBe(full.size);
    await store.media.delete(media.id);
    expect(await store.media.getBlob(media.id, 'full')).toBeUndefined();
  });

  it('references remote images without blobs', async () => {
    const media = await store.media.create({ remoteUrl: 'https://example.org/a.jpg' });
    expect(media.hasBlob).toBe(false);
  });
});

describe('settings', () => {
  it('returns defaults and persists patches', async () => {
    expect((await store.settings.get()).theme).toBe('system');
    await store.settings.update({
      theme: 'dark',
      background: { kind: 'mesh', preset: 'nocturne' },
    });
    const settings = await store.settings.get();
    expect(settings.theme).toBe('dark');
    expect(settings.background).toEqual({ kind: 'mesh', preset: 'nocturne' });
  });
});

describe('domain commands', () => {
  it('de-duplicates places, venues and visits', async () => {
    const { place, venue } = await seedVienna();
    const again = await ensurePlace(store, {
      name: 'wien',
      countryCode: 'AT',
      coords: { lat: 48.2, lng: 16.37 },
    });
    expect(again.id).toBe(place.id);
    expect(again.coords).toEqual({ lat: 48.2, lng: 16.37 });
    expect((await ensureVenue(store, { placeId: place.id, name: 'ALBERTINA' })).id).toBe(venue.id);
    const visit = await ensureVisit(store, venue.id, '2024-05-01');
    expect((await ensureVisit(store, venue.id, '2024-05-01')).id).toBe(visit.id);
    expect(await store.visits.list()).toHaveLength(1);
  });

  it('cascades when removing a place', async () => {
    const { place, venue } = await seedVienna();
    const visit = await store.visits.create({ venueId: venue.id, date: '2024-05-01' });
    const artwork = await store.artworks.create({
      title: 'Feldhase',
      venueId: venue.id,
      visitId: visit.id,
    });
    const trip = await store.trips.create({ title: 'Wien 2', placeIds: [place.id] });

    await removePlace(store, place.id);

    expect(await store.venues.list()).toEqual([]);
    expect(await store.visits.list()).toEqual([]);
    const orphan = await store.artworks.get(artwork.id);
    expect(orphan?.venueId).toBeUndefined();
    expect(orphan?.visitId).toBeUndefined();
    expect((await store.trips.get(trip.id))?.placeIds).toEqual([]);
  });

  it('removes artworks from collections and deletes their media', async () => {
    const media = await store.media.create({}, { full: new Blob(['x']) });
    const artwork = await store.artworks.create({ title: 'Kuss', mediaIds: [media.id] });
    const collection = await store.collections.create({ name: 'Gold' });
    await toggleInCollection(store, collection.id, artwork.id);
    expect((await store.collections.get(collection.id))?.artworkIds).toEqual([artwork.id]);

    await removeArtwork(store, artwork.id);
    expect((await store.collections.get(collection.id))?.artworkIds).toEqual([]);
    expect(await store.media.get(media.id)).toBeUndefined();
  });

  it('turns a trip item into a venue and visit', async () => {
    const place = await store.places.create({ name: 'Paris', countryCode: 'FR' });
    const trip = await store.trips.create({
      title: 'Paris im Frühling',
      placeIds: [place.id],
      items: [{ id: 'i1', name: "Musée d'Orsay", kind: 'museum', osmId: 'way/1' }],
    });

    const { venue, visit } = await completeTripItem(store, trip.id, 'i1', '2025-04-12');
    expect(venue?.name).toBe("Musée d'Orsay");
    expect(venue?.placeId).toBe(place.id);
    expect(visit?.date).toBe('2025-04-12');
    const item = (await store.trips.get(trip.id))?.items[0];
    expect(item).toMatchObject({ done: true, venueId: venue?.id });
  });
});

describe('snapshot & restore', () => {
  it('replaces data and keeps blobs', async () => {
    const { venue } = await seedVienna();
    const media = await store.media.create({}, { full: new Blob(['img']) });
    await store.artworks.create({ title: 'Feldhase', venueId: venue.id, mediaIds: [media.id] });
    const snapshot = await store.snapshot();
    const blob = await store.media.getBlob(media.id, 'full');

    const target = createDexieStore(`restore-${createId()}`);
    await target.places.create({ name: 'Wird ersetzt' });
    await target.restore(snapshot, new Map([[media.id, { full: blob! }]]), 'replace');

    expect((await target.places.list()).map((p) => p.name)).toEqual(['Wien']);
    expect(await target.artworks.list()).toHaveLength(1);
    expect(await (await target.media.getBlob(media.id, 'full'))?.text()).toBe('img');
    await target.db.delete();
  });

  it('notifies subscribers about changed tables', async () => {
    const seen: string[][] = [];
    const unsubscribe = store.subscribe((tables) => seen.push(tables));
    await store.places.create({ name: 'Rom' });
    await new Promise((r) => setTimeout(r, 50));
    unsubscribe();
    expect(seen.flat()).toContain('places');
  });
});
