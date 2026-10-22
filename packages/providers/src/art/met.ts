import { compact, fetchJson, query } from '../http';
import type { ArtworkSearchProvider, ArtworkSearchResult } from '../types';

interface MetSearch {
  total: number;
  objectIDs: number[] | null;
}

interface MetObject {
  objectID: number;
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  medium?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
  creditLine?: string;
}

const BASE = 'https://collectionapi.metmuseum.org/public/collection';

export function mapMetObject(o: MetObject): ArtworkSearchResult | undefined {
  if (!o.primaryImageSmall || !o.title) return undefined;
  return compact({
    provider: 'met',
    externalId: String(o.objectID),
    title: o.title,
    artist: o.artistDisplayName,
    year: o.objectDate,
    medium: o.medium,
    museumName: 'The Metropolitan Museum of Art',
    imageUrl: o.primaryImageSmall,
    thumbnailUrl: o.primaryImageSmall,
    url: o.objectURL,
    license: o.isPublicDomain ? 'CC0' : undefined,
    credit: o.creditLine,
  });
}

/**
 * The Met search only returns object ids (v1.1, paginated since 2026-10); details need one
 * request per object, so results are limited and fetched in parallel.
 */
export const metProvider: ArtworkSearchProvider = {
  id: 'met',
  name: 'The Metropolitan Museum of Art',
  homepage: 'https://metmuseum.github.io/',
  async search(q, ctx) {
    const search = await fetchJson<MetSearch>(
      'met',
      `${BASE}/v1.1/search?${query({ q, hasImages: true, limit: 16 })}`,
      ctx,
    );
    const ids = (search.objectIDs ?? []).slice(0, 16);
    const objects = await Promise.allSettled(
      ids.map((id) => fetchJson<MetObject>('met', `${BASE}/v1/objects/${id}`, ctx)),
    );
    return objects.flatMap((r) => {
      const mapped = r.status === 'fulfilled' ? mapMetObject(r.value) : undefined;
      return mapped ? [mapped] : [];
    });
  },
};
