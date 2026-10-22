import { compact, fetchJson, httpsUrl, ProviderError, query } from '../http';
import type { ArtworkSearchProvider, ArtworkSearchResult } from '../types';

// Providers below need a free API key that the user enters in the settings.

interface EuropeanaItem {
  id: string;
  title?: string[];
  dcCreator?: string[];
  year?: string[];
  edmPreview?: string[];
  edmIsShownBy?: string[];
  guid?: string;
  dataProvider?: string[];
  rights?: string[];
}

export function mapEuropeana(response: { items?: EuropeanaItem[] }): ArtworkSearchResult[] {
  return (response.items ?? []).flatMap((i) => {
    const preview = httpsUrl(i.edmPreview?.[0]);
    const title = i.title?.[0];
    if (!preview || !title) return [];
    return [
      compact({
        provider: 'europeana',
        externalId: i.id,
        title,
        artist: i.dcCreator?.find((c) => !c.startsWith('http')),
        year: i.year?.[0],
        museumName: i.dataProvider?.[0],
        imageUrl: httpsUrl(i.edmIsShownBy?.[0]) ?? preview,
        thumbnailUrl: preview,
        url: i.guid,
        license: i.rights?.[0],
        credit: i.dataProvider?.[0],
      }),
    ];
  });
}

export const europeanaProvider: ArtworkSearchProvider = {
  id: 'europeana',
  name: 'Europeana',
  homepage: 'https://pro.europeana.eu/page/get-api',
  requiresKey: { id: 'europeana', signupUrl: 'https://pro.europeana.eu/page/get-api' },
  async search(q, ctx) {
    const key = ctx.keys?.europeana;
    if (!key) throw new ProviderError('europeana', 'API key missing');
    const url = `https://api.europeana.eu/record/v2/search.json?${query({
      wskey: key,
      query: q,
      media: true,
      qf: 'TYPE:IMAGE',
      rows: 24,
      profile: 'standard',
    })}`;
    return mapEuropeana(await fetchJson('europeana', url, ctx));
  },
};

interface HarvardRecord {
  id: number;
  title?: string;
  dated?: string;
  medium?: string;
  primaryimageurl?: string | null;
  url?: string;
  creditline?: string;
  people?: Array<{ name: string; role?: string }>;
}

export function mapHarvard(response: { records?: HarvardRecord[] }): ArtworkSearchResult[] {
  return (response.records ?? []).flatMap((r) => {
    if (!r.primaryimageurl || !r.title) return [];
    return [
      compact({
        provider: 'harvard',
        externalId: String(r.id),
        title: r.title,
        artist: r.people?.find((p) => p.role === 'Artist')?.name ?? r.people?.[0]?.name,
        year: r.dated,
        medium: r.medium,
        museumName: 'Harvard Art Museums',
        imageUrl: r.primaryimageurl,
        thumbnailUrl: `${r.primaryimageurl}?width=400`,
        url: r.url,
        credit: r.creditline,
      }),
    ];
  });
}

export const harvardProvider: ArtworkSearchProvider = {
  id: 'harvard',
  name: 'Harvard Art Museums',
  homepage: 'https://harvardartmuseums.org/collections/api',
  requiresKey: { id: 'harvard', signupUrl: 'https://harvardartmuseums.org/collections/api' },
  async search(q, ctx) {
    const key = ctx.keys?.harvard;
    if (!key) throw new ProviderError('harvard', 'API key missing');
    const url = `https://api.harvardartmuseums.org/object?${query({
      apikey: key,
      q,
      hasimage: 1,
      size: 24,
      fields: 'id,title,dated,medium,primaryimageurl,url,creditline,people',
    })}`;
    return mapHarvard(await fetchJson('harvard', url, ctx));
  },
};
