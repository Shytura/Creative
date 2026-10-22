import { type EpochId, epochs } from '@mnemo/core';

/** URL search params of the collection page; every filter is shareable as a link. */
export interface CollectionSearch {
  q?: string;
  status?: 'seen' | 'wishlist';
  fav?: boolean;
  artist?: string;
  place?: string;
  venue?: string;
  tag?: string;
  epoch?: EpochId;
  color?: string;
  collection?: string;
  view?: 'gallery' | 'wall' | 'list';
}

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);
const oneOf = <T extends string>(v: unknown, values: readonly T[]) =>
  values.includes(v as T) ? (v as T) : undefined;

export function validateCollectionSearch(search: Record<string, unknown>): CollectionSearch {
  const result: CollectionSearch = {
    q: str(search.q),
    status: oneOf(search.status, ['seen', 'wishlist'] as const),
    fav: search.fav === true || search.fav === 'true' ? true : undefined,
    artist: str(search.artist),
    place: str(search.place),
    venue: str(search.venue),
    tag: str(search.tag),
    epoch: oneOf(
      search.epoch,
      epochs.map((e) => e.id),
    ),
    color:
      typeof search.color === 'string' && /^#[0-9a-f]{6}$/i.test(search.color)
        ? search.color
        : undefined,
    collection: str(search.collection),
    view: oneOf(search.view, ['gallery', 'wall', 'list'] as const),
  };
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
}

export function validateDiscoverSearch(search: Record<string, unknown>): { q?: string } {
  const q = str(search.q);
  return q ? { q } : {};
}
