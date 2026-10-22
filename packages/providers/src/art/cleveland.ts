import { compact, fetchJson, query } from '../http';
import type { ArtworkSearchProvider, ArtworkSearchResult } from '../types';

interface CmaArtwork {
  id: number;
  title: string;
  creation_date?: string | null;
  technique?: string | null;
  url?: string;
  share_license_status?: string;
  creditline?: string | null;
  creators?: Array<{ description?: string | null; role?: string }>;
  images?: { web?: { url: string } | null; print?: { url: string } | null } | null;
}

/** `Claude Monet (French, 1840–1926)` → `Claude Monet` */
const artistName = (description: string | null | undefined) =>
  description?.replace(/\s*\(.*\)\s*$/, '').trim() || undefined;

export function mapCleveland(response: { data: CmaArtwork[] }): ArtworkSearchResult[] {
  return response.data.flatMap((a) => {
    const web = a.images?.web?.url;
    if (!web) return [];
    return [
      compact({
        provider: 'cleveland',
        externalId: String(a.id),
        title: a.title,
        artist: artistName(a.creators?.[0]?.description),
        year: a.creation_date ?? undefined,
        medium: a.technique ?? undefined,
        museumName: 'Cleveland Museum of Art',
        imageUrl: a.images?.print?.url ?? web,
        thumbnailUrl: web,
        url: a.url,
        license: a.share_license_status,
        credit: a.creditline ?? undefined,
      }),
    ];
  });
}

export const clevelandProvider: ArtworkSearchProvider = {
  id: 'cleveland',
  name: 'Cleveland Museum of Art',
  homepage: 'https://openaccess-api.clevelandart.org/',
  // Their CDN caches responses without CORS headers when the first request had no Origin;
  // the extra `client` parameter keeps browser requests in their own cache entries.
  async search(q, ctx) {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?${query({ q, has_image: 1, limit: 24, client: 'mnemo' })}`;
    return mapCleveland(await fetchJson<{ data: CmaArtwork[] }>('cleveland', url, ctx));
  },
};
