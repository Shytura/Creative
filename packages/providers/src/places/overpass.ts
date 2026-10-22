import { compact, fetchJson, ProviderError } from '../http';
import type { PoiProvider, PoiResult, ProviderContext } from '../types';
import { venueKindFromTags } from './osm';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Public instances; the next one is tried when one is overloaded. */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** A bounding box filter is considerably cheaper for Overpass than `around`. */
export function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lat - dLat, lng - dLng, lat + dLat, lng + dLng].map((n) => n.toFixed(4)).join(',');
  return `[out:json][timeout:60][bbox:${bbox}];
(
  nwr["tourism"~"^(museum|gallery|attraction|viewpoint)$"]["name"];
  nwr["historic"~"^(castle|palace|monument|memorial|archaeological_site|city_gate|fort|ruins|church)$"]["name"]["wikidata"];
  nwr["amenity"="place_of_worship"]["name"]["wikidata"];
  nwr["leisure"~"^(park|garden)$"]["name"]["wikidata"];
);
out center tags 300;`;
}

function score(tags: Record<string, string>): number {
  let s = 0;
  if (tags.wikidata) s += 3;
  if (tags.wikipedia) s += 2;
  if (tags.tourism === 'museum' || tags.tourism === 'gallery') s += 2;
  if (tags.tourism === 'attraction') s += 1;
  if (tags.website || tags['contact:website']) s += 1;
  if (tags.image || tags.wikimedia_commons) s += 1;
  if (tags.heritage) s += 1;
  return s;
}

export function mapOverpass(elements: OverpassElement[]): PoiResult[] {
  const seen = new Set<string>();
  return elements
    .flatMap((e) => {
      const tags = e.tags ?? {};
      const lat = e.lat ?? e.center?.lat;
      const lng = e.lon ?? e.center?.lon;
      const name = tags.name;
      if (!name || lat === undefined || lng === undefined) return [];
      return [
        compact({
          osmId: `${e.type}/${e.id}`,
          name,
          kind: venueKindFromTags(tags),
          coords: { lat, lng },
          website: tags.website ?? tags['contact:website'],
          wikidataId: tags.wikidata,
          wikipedia: tags.wikipedia,
          openingHours: tags.opening_hours,
          score: score(tags),
        }),
      ];
    })
    .sort((a, b) => b.score - a.score)
    .filter((p) => {
      const key = p.wikidataId ?? p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Public Overpass instances are often busy. All endpoints are queried at once; the first
 * successful answer wins and the remaining requests are cancelled.
 */
async function run(q: string, ctx: ProviderContext): Promise<OverpassElement[]> {
  const race = new AbortController();
  const signal = ctx.signal ? AbortSignal.any([ctx.signal, race.signal]) : race.signal;
  try {
    const response = await Promise.any(
      OVERPASS_ENDPOINTS.map((endpoint) =>
        fetchJson<{ elements: OverpassElement[] }>(
          'overpass',
          endpoint,
          { ...ctx, signal },
          {
            init: { method: 'POST', body: new URLSearchParams({ data: q }) },
            timeoutMs: 75_000,
          },
        ),
      ),
    );
    return response.elements;
  } catch (error) {
    if (ctx.signal?.aborted) throw ctx.signal.reason;
    const first = error instanceof AggregateError ? error.errors[0] : error;
    throw first instanceof ProviderError ? first : new ProviderError('overpass', 'unavailable');
  } finally {
    race.abort();
  }
}

export const overpassProvider: PoiProvider = {
  async nearby(center, radiusMeters, ctx) {
    const elements = await run(buildOverpassQuery(center.lat, center.lng, radiusMeters), ctx);
    return mapOverpass(elements).slice(0, 80);
  },
};
