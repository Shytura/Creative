import { paletteMatches } from '../lib/color';
import { hashString, normalizeName, parseYear } from '../lib/misc';
import type { Artwork, ArtworkStatus, Collection, Venue } from '../model/entities';

export const epochs = [
  { id: 'antiquity', to: 499 },
  { id: 'middleAges', from: 500, to: 1399 },
  { id: 'renaissance', from: 1400, to: 1599 },
  { id: 'baroque', from: 1600, to: 1749 },
  { id: 'classicism', from: 1750, to: 1849 },
  { id: 'modernity', from: 1850, to: 1913 },
  { id: 'modernism', from: 1914, to: 1959 },
  { id: 'contemporary', from: 1960 },
] as const;
export type EpochId = (typeof epochs)[number]['id'];

export function epochOf(year: number | undefined): EpochId | undefined {
  if (year === undefined) return undefined;
  return epochs.find(
    (e) => ('from' in e ? year >= e.from : true) && ('to' in e ? year <= e.to : true),
  )?.id;
}

export interface ArtworkFilter {
  query?: string;
  status?: ArtworkStatus;
  favorite?: boolean;
  artist?: string;
  venueId?: string;
  placeId?: string;
  tag?: string;
  epoch?: EpochId;
  color?: string;
  collectionId?: string;
}

export interface ArtworkFilterContext {
  venues: ReadonlyMap<string, Venue>;
  collections: readonly Collection[];
}

export function filterArtworks(
  artworks: readonly Artwork[],
  filter: ArtworkFilter,
  ctx: ArtworkFilterContext,
): Artwork[] {
  const terms = filter.query ? normalizeName(filter.query).split(' ').filter(Boolean) : [];
  const collection = filter.collectionId
    ? ctx.collections.find((c) => c.id === filter.collectionId)
    : undefined;

  const result = artworks.filter((a) => {
    const venue = a.venueId ? ctx.venues.get(a.venueId) : undefined;
    if (filter.status && a.status !== filter.status) return false;
    if (filter.favorite && !a.favorite) return false;
    if (filter.artist && a.artist !== filter.artist) return false;
    if (filter.venueId && a.venueId !== filter.venueId) return false;
    if (filter.placeId && venue?.placeId !== filter.placeId) return false;
    if (filter.tag && !a.tags.includes(filter.tag)) return false;
    if (filter.epoch && epochOf(parseYear(a.year)) !== filter.epoch) return false;
    if (filter.color && !paletteMatches(a.palette, filter.color)) return false;
    if (collection && !collection.artworkIds.includes(a.id)) return false;
    if (terms.length > 0) {
      const haystack = normalizeName(
        [a.title, a.artist, a.medium, a.year, venue?.name, a.notes, ...a.tags].join(' '),
      );
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  if (collection) {
    const order = new Map(collection.artworkIds.map((id, i) => [id, i]));
    result.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return result;
}

/** Distinct values with counts, most frequent first. */
export function facet(
  values: ReadonlyArray<string | undefined>,
): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/**
 * Deterministic pick for a given day. Favourites with an image are preferred, then any
 * artwork with an image, then anything.
 */
export function artworkOfTheDay(artworks: readonly Artwork[], day: string): Artwork | undefined {
  const withImage = artworks.filter((a) => a.mediaIds.length > 0);
  const favorites = withImage.filter((a) => a.favorite);
  const pool = favorites.length >= 3 ? favorites : withImage.length > 0 ? withImage : artworks;
  if (pool.length === 0) return undefined;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[hashString(day) % sorted.length];
}
