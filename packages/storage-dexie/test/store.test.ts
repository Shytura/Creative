import {
  completeTripItem,
  createId,
  ensurePlace,
  ensureVenue,
  ensureVisit,
  entityNames,
  findBookByIsbn,
  lendBook,
  mergeDuplicateCreators,
  migrations,
  removeArtwork,
  removeBook,
  removeCreator,
  removePlace,
  removeQuote,
  returnBook,
  SCHEMA_VERSION,
  saveArtwork,
  saveBook,
  saveQuote,
  setReadingStatus,
  toggleInCollection,
} from '@mnemo/core';
import { Dexie } from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDexieStore, type DexieStore, STORES } from '../src';

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
    const ref = { kind: 'artwork' as const, id: artwork.id };
    await toggleInCollection(store, collection.id, ref);
    expect((await store.collections.get(collection.id))?.items).toEqual([ref]);

    await removeArtwork(store, artwork.id);
    expect((await store.collections.get(collection.id))?.items).toEqual([]);
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

describe('creators', () => {
  it('links artworks to creators through their attribution', async () => {
    const a = await saveArtwork(store, { title: 'Feldhase', artist: ' Albrecht Dürer ' });
    const b = await saveArtwork(store, { title: 'Betende Hände', artist: 'albrecht durer' });
    expect(a.artist).toBe('Albrecht Dürer');
    expect(b.creatorIds).toEqual(a.creatorIds);
    expect(await store.creators.list()).toHaveLength(1);

    // Renaming the creator keeps the links while the attribution stays unchanged.
    await store.creators.update(a.creatorIds[0]!, { name: 'Dürer, Albrecht' });
    const edited = await saveArtwork(
      store,
      { title: 'Der Feldhase', artist: 'Albrecht Dürer' },
      a.id,
    );
    expect(edited.creatorIds).toEqual(a.creatorIds);

    const cleared = await saveArtwork(store, { title: 'Der Feldhase', artist: '' }, a.id);
    expect(cleared.creatorIds).toEqual([]);
    expect(cleared.artist).toBeUndefined();
  });

  it('merges duplicates and keeps the one linked to Wikidata', async () => {
    const plain = await store.creators.create({ name: 'Vermeer' });
    const linked = await store.creators.create({ name: 'vermeer', wikidataId: 'Q41264' });
    const other = await store.creators.create({ name: 'Rembrandt' });
    const art = await store.artworks.create({ title: 'Milchmagd', creatorIds: [plain.id] });

    expect(await mergeDuplicateCreators(store)).toBe(1);
    expect((await store.creators.list()).map((c) => c.id).sort()).toEqual(
      [linked.id, other.id].sort(),
    );
    expect((await store.artworks.get(art.id))?.creatorIds).toEqual([linked.id]);
    expect(await mergeDuplicateCreators(store)).toBe(0);
  });

  it('unlinks works of every kind when a creator is removed', async () => {
    const art = await saveArtwork(store, { title: 'Kuss', artist: 'Gustav Klimt' });
    const book = await saveBook(store, { title: 'Briefe', authors: ['Gustav Klimt'] });
    expect(book.creatorIds).toEqual(art.creatorIds);
    await removeCreator(store, art.creatorIds[0]!);
    const after = await store.artworks.get(art.id);
    expect(after?.creatorIds).toEqual([]);
    expect(after?.artist).toBe('Gustav Klimt');
    expect((await store.books.get(book.id))?.creatorIds).toEqual([]);
  });

  it('merges duplicates across artworks and books', async () => {
    const a = await store.creators.create({ name: 'Goethe' });
    const b = await store.creators.create({ name: 'goethe' });
    const art = await store.artworks.create({ title: 'Zeichnung', creatorIds: [a.id] });
    const book = await store.books.create({ title: 'Faust', creatorIds: [b.id, a.id] });
    expect(await mergeDuplicateCreators(store)).toBe(1);
    expect((await store.artworks.get(art.id))?.creatorIds).toEqual([a.id]);
    expect((await store.books.get(book.id))?.creatorIds).toEqual([a.id]);
  });
});

describe('library', () => {
  it('links several authors and keeps links of names that stay', async () => {
    const book = await saveBook(store, {
      title: 'Good Omens',
      authors: ['Terry Pratchett', ' Neil Gaiman', ''],
      isbn: '0-575-04800-X',
    });
    expect(book.authors).toEqual(['Terry Pratchett', 'Neil Gaiman']);
    expect(book.isbn).toBe('9780575048003');
    expect(book.creatorIds).toHaveLength(2);
    const [pratchett, gaiman] = book.creatorIds;

    // A linked creator renamed after Wikidata keeps its books when the authors change.
    await store.creators.update(gaiman!, { name: 'Neil Richard Gaiman' });
    const edited = await saveBook(
      store,
      { title: 'Good Omens', authors: ['Neil Gaiman', 'Someone Else'] },
      book.id,
    );
    expect(edited.creatorIds[0]).toBe(gaiman);
    expect(edited.creatorIds).not.toContain(pratchett);
    expect(await store.creators.list()).toHaveLength(3);
    expect((await findBookByIsbn(store, '978-0-575-04800-3'))?.id).toBe(book.id);
  });

  it('tracks reading status, quotes and loans', async () => {
    const book = await saveBook(store, { title: 'Der Zauberberg', pageCount: 1000 });
    await store.books.update(book.id, { currentPage: 120 });
    await setReadingStatus(store, book.id, 'reading', '2025-01-01');
    expect((await store.books.get(book.id))?.currentPage).toBe(120);
    const read = await setReadingStatus(store, book.id, 'read', '2025-03-01');
    expect(read.readings).toEqual([{ startedOn: '2025-01-01', finishedOn: '2025-03-01' }]);
    expect(read.currentPage).toBeUndefined();

    const quoted = await saveQuote(store, book.id, {
      text: 'Die Zeit ist ein Geheimnis.',
      page: 7,
    });
    const quote = quoted.quotes[0]!;
    const edited = await saveQuote(store, book.id, { text: 'Zeit', page: 8 }, quote.id);
    expect(edited.quotes).toEqual([{ ...quote, text: 'Zeit', page: 8 }]);
    expect((await removeQuote(store, book.id, quote.id)).quotes).toEqual([]);

    const lent = await lendBook(store, book.id, { name: 'Mia', since: '2025-04-01' });
    expect(lent.loan?.name).toBe('Mia');
    expect((await returnBook(store, book.id)).loan).toBeUndefined();

    const wish = await saveBook(store, { title: 'Doktor Faustus', ownership: 'wishlist' });
    await expect(lendBook(store, wish.id, { name: 'Mia', since: '2025-04-01' })).rejects.toThrow();
  });

  it('removes books from lists and deletes their covers', async () => {
    const cover = await store.media.create({ remoteUrl: 'https://example.org/c.jpg' });
    const book = await saveBook(store, { title: 'Buddenbrooks', mediaIds: [cover.id] });
    const list = await store.collections.create({ name: 'Lübeck' });
    await toggleInCollection(store, list.id, { kind: 'book', id: book.id });
    await removeBook(store, book.id);
    expect(await store.books.get(book.id)).toBeUndefined();
    expect(await store.media.get(cover.id)).toBeUndefined();
    expect((await store.collections.get(list.id))?.items).toEqual([]);
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

  it('clears all entities but keeps settings', async () => {
    await seedVienna();
    await store.media.create({}, { full: new Blob(['img']) });
    await store.settings.update({ theme: 'dark' });
    await store.clear();
    const snapshot = await store.snapshot();
    expect(Object.values(snapshot).every((rows) => rows.length === 0)).toBe(true);
    expect(await store.media.usage()).toBe(0);
    expect((await store.settings.get()).theme).toBe('dark');
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

describe('schema upgrades', () => {
  it('declares indexes for every schema version and every entity', () => {
    expect(Object.keys(STORES).map(Number)).toEqual([1, ...migrations.map((m) => m.to)]);
    expect(Math.max(...Object.keys(STORES).map(Number))).toBe(SCHEMA_VERSION);
    const tables = new Set(Object.values(STORES).flatMap((s) => Object.keys(s)));
    for (const name of entityNames) expect(tables).toContain(name);
  });

  it('migrates a database created by version 0.1', async () => {
    const name = `legacy-${createId()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores(STORES[1]!);
    const row = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    await legacy.table('artworks').add({
      ...row,
      id: 'a1',
      schemaVersion: 1,
      title: 'Feldhase',
      artist: 'Albrecht Dürer',
    });
    await legacy.table('collections').add({
      ...row,
      id: 'c1',
      schemaVersion: 1,
      name: 'Dürer',
      description: '',
      artworkIds: ['a1'],
    });
    legacy.close();

    const upgraded = createDexieStore(name);
    const collection = await upgraded.collections.get('c1');
    expect(collection?.items).toEqual([{ kind: 'artwork', id: 'a1' }]);
    expect(collection).not.toHaveProperty('artworkIds');
    expect(collection?.schemaVersion).toBe(SCHEMA_VERSION);
    const artwork = await upgraded.artworks.get('a1');
    expect(artwork?.title).toBe('Feldhase');
    expect(artwork?.creatorIds).toEqual(['creator-albrecht-durer']);
    expect((await upgraded.creators.list()).map((c) => c.name)).toEqual(['Albrecht Dürer']);
    expect(await upgraded.books.list()).toEqual([]);
    await upgraded.db.delete();
  });

  it('adds the library to a database created by version 0.3', async () => {
    const name = `legacy-${createId()}`;
    const legacy = new Dexie(name);
    for (const version of [1, 2, 3]) legacy.version(version).stores(STORES[version]!);
    const row = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    await legacy.table('creators').add({ ...row, id: 'c1', schemaVersion: 3, name: 'Klimt' });
    await legacy
      .table('artworks')
      .add({ ...row, id: 'a1', schemaVersion: 3, title: 'Kuss', creatorIds: ['c1'] });
    legacy.close();

    const upgraded = createDexieStore(name);
    expect(await upgraded.artworks.get('a1')).toMatchObject({
      creatorIds: ['c1'],
      schemaVersion: SCHEMA_VERSION,
    });
    const book = await saveBook(upgraded, { title: 'Briefe', authors: ['Klimt'] });
    expect(book.creatorIds).toEqual(['c1']);
    await upgraded.db.delete();
  });
});
