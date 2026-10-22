import { describe, expect, it } from 'vitest';
import {
  type Artwork,
  accentFromPalette,
  archiveToSnapshot,
  artworkOfTheDay,
  artworkSchema,
  colorDistance,
  computeInsights,
  contrastRatio,
  createArchive,
  distanceKm,
  ensureContrast,
  epochOf,
  filterArtworks,
  flagEmoji,
  nearby,
  type Place,
  parseArchive,
  parseYear,
  placeSchema,
  settingsSchema,
  sortByHue,
  subsetArchive,
  type Venue,
  type Visit,
  venueSchema,
  visitSchema,
} from '../src';

const meta = (id: string) => ({
  id,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

const place = (id: string, name: string, countryCode: string, country: string): Place =>
  placeSchema.parse({ ...meta(id), name, countryCode, country });
const venue = (id: string, placeId: string, name: string): Venue =>
  venueSchema.parse({ ...meta(id), placeId, name });
const visit = (id: string, venueId: string, date: string): Visit =>
  visitSchema.parse({ ...meta(id), venueId, date });
const artwork = (id: string, fields: Partial<Artwork> = {}): Artwork =>
  artworkSchema.parse({ ...meta(id), title: `Werk ${id}`, ...fields });

describe('schemas', () => {
  it('applies defaults', () => {
    const a = artwork('a1');
    expect(a.status).toBe('seen');
    expect(a.tags).toEqual([]);
    expect(a.schemaVersion).toBe(1);
  });

  it('rejects invalid dates and colours', () => {
    expect(() => visitSchema.parse({ ...meta('v'), venueId: 'x', date: '17.05.2024' })).toThrow();
    expect(() => artworkSchema.parse({ ...meta('a'), title: 'x', palette: ['red'] })).toThrow();
  });

  it('provides complete default settings', () => {
    const s = settingsSchema.parse({});
    expect(s.background).toEqual({ kind: 'paper' });
    expect(s.theme).toBe('system');
  });
});

describe('misc helpers', () => {
  it('parses museum date strings', () => {
    expect(parseYear('c. 1868–73')).toBe(1868);
    expect(parseYear('um 1500')).toBe(1500);
    expect(parseYear('450 BCE')).toBe(-450);
    expect(parseYear('undatiert')).toBeUndefined();
  });

  it('builds flag emoji', () => {
    expect(flagEmoji('at')).toBe('🇦🇹');
    expect(flagEmoji(undefined)).toBe('🏳️');
  });

  it('classifies epochs', () => {
    expect(epochOf(1889)).toBe('modernity');
    expect(epochOf(1503)).toBe('renaissance');
    expect(epochOf(-200)).toBe('antiquity');
    expect(epochOf(2001)).toBe('contemporary');
  });
});

describe('color', () => {
  it('guarantees contrast', () => {
    const fixed = ensureContrast('#f0d060', '#f5f1ea', 4.5);
    expect(contrastRatio(fixed, '#f5f1ea')).toBeGreaterThanOrEqual(4.5);
  });

  it('measures perceptual distance', () => {
    expect(colorDistance('#ff0000', '#fe0101')).toBeLessThan(2);
    expect(colorDistance('#ff0000', '#0000ff')).toBeGreaterThan(100);
  });

  it('picks a saturated accent and ignores greys', () => {
    expect(accentFromPalette(['#777777', '#888888'], '#ffffff')).toBeNull();
    const accent = accentFromPalette(['#808080', '#2a5db0'], '#f5f1ea');
    expect(accent).not.toBeNull();
    expect(colorDistance(accent!, '#2a5db0')).toBeLessThan(10);
  });

  it('sorts colours by hue with greys last', () => {
    expect(sortByHue(['#888888', '#0000ff', '#ff0000'])).toEqual(['#ff0000', '#0000ff', '#888888']);
  });
});

describe('geo', () => {
  const vienna = { lat: 48.2083, lng: 16.3725 };
  const paris = { lat: 48.8566, lng: 2.3522 };

  it('computes great-circle distance', () => {
    expect(distanceKm(vienna, paris)).toBeGreaterThan(1030);
    expect(distanceKm(vienna, paris)).toBeLessThan(1040);
  });

  it('finds nearby items', () => {
    const items = [
      { name: 'Albertina', coords: { lat: 48.2046, lng: 16.3683 } },
      { name: 'Louvre', coords: { lat: 48.8606, lng: 2.3376 } },
      { name: 'Ohne Koordinaten' },
    ];
    expect(nearby(items, vienna, 5).map((i) => i.name)).toEqual(['Albertina']);
  });
});

describe('queries', () => {
  const venues = new Map([['v1', venue('v1', 'p1', 'Albertina')]]);
  const artworks = [
    artwork('a1', {
      title: 'Feldhase',
      artist: 'Albrecht Dürer',
      year: '1502',
      venueId: 'v1',
      palette: ['#8a6a3a'],
    }),
    artwork('a2', {
      title: 'Seerosen',
      artist: 'Claude Monet',
      year: '1906',
      favorite: true,
      palette: ['#3a6a8a'],
    }),
    artwork('a3', {
      title: 'Der Kuss',
      artist: 'Gustav Klimt',
      status: 'wishlist',
      tags: ['gold'],
    }),
  ];
  const ctx = { venues, collections: [] };

  it('searches across fields including the venue', () => {
    expect(filterArtworks(artworks, { query: 'albertina' }, ctx).map((a) => a.id)).toEqual(['a1']);
    expect(filterArtworks(artworks, { query: 'durer feld' }, ctx).map((a) => a.id)).toEqual(['a1']);
  });

  it('filters by facets', () => {
    expect(filterArtworks(artworks, { status: 'wishlist' }, ctx).map((a) => a.id)).toEqual(['a3']);
    expect(filterArtworks(artworks, { epoch: 'renaissance' }, ctx).map((a) => a.id)).toEqual([
      'a1',
    ]);
    expect(filterArtworks(artworks, { color: '#3b6b8b' }, ctx).map((a) => a.id)).toEqual(['a2']);
    expect(filterArtworks(artworks, { favorite: true, tag: 'gold' }, ctx)).toEqual([]);
  });

  it('respects collection order', () => {
    const collections = [
      { ...meta('c1'), schemaVersion: 1, name: 'Liste', description: '', artworkIds: ['a3', 'a1'] },
    ];
    expect(
      filterArtworks(artworks, { collectionId: 'c1' }, { venues, collections }).map((a) => a.id),
    ).toEqual(['a3', 'a1']);
  });

  it('picks a stable artwork of the day', () => {
    const withMedia = artworks.map((a) => ({ ...a, mediaIds: ['m'] }));
    const pick = artworkOfTheDay(withMedia, '2026-10-21');
    expect(pick).toBeDefined();
    expect(artworkOfTheDay(withMedia, '2026-10-21')?.id).toBe(pick?.id);
    expect(artworkOfTheDay([], '2026-10-21')).toBeUndefined();
  });
});

describe('insights', () => {
  it('aggregates visits, places and countries', () => {
    const insights = computeInsights({
      places: [
        place('p1', 'Wien', 'AT', 'Österreich'),
        place('p2', 'Paris', 'FR', 'Frankreich'),
        place('p3', 'Rom', 'IT', 'Italien'),
      ],
      venues: [
        venue('v1', 'p1', 'Albertina'),
        venue('v2', 'p2', 'Louvre'),
        venue('v3', 'p3', 'Vatikan'),
      ],
      visits: [
        visit('x1', 'v1', '2023-04-02'),
        visit('x2', 'v1', '2024-06-10'),
        visit('x3', 'v2', '2024-08-01'),
      ],
      artworks: [
        artwork('a1', { artist: 'Dürer', venueId: 'v1' }),
        artwork('a2', { artist: 'Dürer' }),
        artwork('a3', { status: 'wishlist', venueId: 'v3' }),
      ],
    });
    expect(insights.totals).toMatchObject({
      countries: 2,
      places: 2,
      venues: 2,
      visits: 3,
      artworks: 2,
      wishlist: 1,
    });
    expect(insights.visitsByYear).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 2 },
    ]);
    expect(insights.topArtists[0]).toEqual({ value: 'Dürer', count: 2 });
    expect(insights.topVenues[0]?.venue.name).toBe('Albertina');
    expect(insights.firstVisit?.id).toBe('x1');
    expect(insights.visitedPlaceIds.has('p3')).toBe(false);
  });
});

describe('archive', () => {
  const snapshot = {
    places: [place('p1', 'Wien', 'AT', 'Österreich')],
    venues: [venue('v1', 'p1', 'Albertina'), venue('v2', 'p1', 'Belvedere')],
    visits: [visit('x1', 'v1', '2023-04-02')],
    artworks: [
      artwork('a1', { venueId: 'v1', mediaIds: ['m1'] }),
      artwork('a2', { venueId: 'v2' }),
    ],
    collections: [],
    trips: [],
    media: [{ ...meta('m1'), schemaVersion: 1, mime: 'image/webp', hasBlob: true, palette: [] }],
  };

  it('round-trips through JSON', () => {
    const archive = createArchive(snapshot, (id) => `data:image/webp;base64,${id}`);
    const parsed = parseArchive(JSON.parse(JSON.stringify(archive)));
    expect(parsed.media[0]?.src).toBe('data:image/webp;base64,m1');
    expect(archiveToSnapshot(parsed)).toEqual(snapshot);
  });

  it('rejects foreign files', () => {
    expect(() => parseArchive({ format: 'other' })).toThrow();
  });

  it('builds a self-contained subset', () => {
    const subset = subsetArchive(createArchive(snapshot), new Set(['a1']));
    expect(subset.artworks.map((a) => a.id)).toEqual(['a1']);
    expect(subset.venues.map((v) => v.id)).toEqual(['v1']);
    expect(subset.media).toHaveLength(1);
  });
});
