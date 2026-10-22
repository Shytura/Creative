import { fetchJson, ProviderError, WIKIMEDIA_HEADERS } from '../http';
import type { ProviderContext, WikiSummary } from '../types';

interface SummaryResponse {
  type: string;
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

export function mapSummary(r: SummaryResponse): WikiSummary | undefined {
  if (r.type === 'disambiguation' || !r.extract) return undefined;
  return {
    title: r.title,
    extract: r.extract,
    imageUrl: r.thumbnail?.source,
    url: r.content_urls?.desktop?.page ?? '',
  };
}

/** Summary of a Wikipedia article, or undefined if it does not exist or is ambiguous. */
export async function wikipediaSummary(
  lang: string,
  title: string,
  ctx: ProviderContext,
): Promise<WikiSummary | undefined> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
  try {
    return mapSummary(
      await fetchJson<SummaryResponse>('wikipedia', url, ctx, {
        init: { headers: WIKIMEDIA_HEADERS },
      }),
    );
  } catch (error) {
    if (error instanceof ProviderError && error.status === 404) return undefined;
    throw error;
  }
}

/** Resolves an OpenStreetMap-style `lang:Title` reference. */
export function wikipediaSummaryFromTag(tag: string, ctx: ProviderContext) {
  const separator = tag.indexOf(':');
  if (separator < 2) return Promise.resolve(undefined);
  return wikipediaSummary(tag.slice(0, separator), tag.slice(separator + 1), ctx);
}
