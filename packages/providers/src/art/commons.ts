import { fetchJson, query, WIKIMEDIA_HEADERS } from '../http';
import type { ProviderContext } from '../types';

const FILE_PATH = /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/;

interface ImageInfoResponse {
  query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
}

/** File name of a `Special:FilePath` URL, or undefined for any other URL. */
export function commonsFileName(url: string): string | undefined {
  const match = url.match(FILE_PATH);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/**
 * `Special:FilePath` URLs redirect without CORS headers, so the image can be shown but not
 * downloaded. The imageinfo API returns the final thumbnail URL, which is CORS-enabled.
 * Other URLs are returned unchanged.
 */
export async function resolveCommonsImage(
  url: string,
  width: number,
  ctx: ProviderContext,
): Promise<string> {
  const file = commonsFileName(url);
  if (!file) return url;
  const api = `https://commons.wikimedia.org/w/api.php?${query({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: width,
    format: 'json',
    origin: '*',
  })}`;
  const response = await fetchJson<ImageInfoResponse>('commons', api, ctx, {
    init: { headers: WIKIMEDIA_HEADERS },
  });
  const info = Object.values(response.query?.pages ?? {})[0]?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? url;
}
