import { compact, fetchJson, query } from '../http';
import type { ArtworkSearchProvider, ArtworkSearchResult } from '../types';

interface AicArtwork {
  id: number;
  title: string;
  artist_title?: string | null;
  artist_display?: string | null;
  date_display?: string | null;
  medium_display?: string | null;
  image_id?: string | null;
  is_public_domain?: boolean;
  thumbnail?: { alt_text?: string | null } | null;
}

interface AicResponse {
  data: AicArtwork[];
  config?: { iiif_url?: string };
}

const FIELDS =
  'id,title,artist_title,artist_display,date_display,medium_display,image_id,is_public_domain,thumbnail';

export function mapAic(response: AicResponse): ArtworkSearchResult[] {
  const iiif = response.config?.iiif_url ?? 'https://www.artic.edu/iiif/2';
  return response.data
    .filter((a) => a.image_id)
    .map((a) =>
      compact({
        provider: 'aic',
        externalId: String(a.id),
        title: a.title,
        artist: a.artist_title ?? a.artist_display?.split('\n')[0] ?? undefined,
        year: a.date_display ?? undefined,
        medium: a.medium_display ?? undefined,
        museumName: 'Art Institute of Chicago',
        imageUrl: `${iiif}/${a.image_id}/full/1686,/0/default.jpg`,
        thumbnailUrl: `${iiif}/${a.image_id}/full/400,/0/default.jpg`,
        iiifInfoUrl: `${iiif}/${a.image_id}/info.json`,
        url: `https://www.artic.edu/artworks/${a.id}`,
        license: a.is_public_domain ? 'CC0' : undefined,
        credit: 'Art Institute of Chicago',
      }),
    );
}

export const aicProvider: ArtworkSearchProvider = {
  id: 'aic',
  name: 'Art Institute of Chicago',
  homepage: 'https://www.artic.edu/open-access',
  async search(q, ctx) {
    const url = `https://api.artic.edu/api/v1/artworks/search?${query({ q, limit: 24, fields: FIELDS })}`;
    return mapAic(await fetchJson<AicResponse>('aic', url, ctx));
  },
};
