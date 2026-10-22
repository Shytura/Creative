import type { Coords } from '@mnemo/core';
import { compact, fetchJson } from '../http';
import type { PlaceResult, PlaceSearchProvider, ProviderContext } from '../types';
import { osmRef, venueKindFromOsm } from './osm';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    city?: string;
    country?: string;
    countrycode?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

const BASE = 'https://photon.komoot.io';
const VENUE_TAGS = [
  'tourism:museum',
  'tourism:gallery',
  'tourism:attraction',
  'tourism:viewpoint',
  'historic',
  'amenity:place_of_worship',
  'amenity:arts_centre',
  'leisure:park',
  'leisure:garden',
];

export function mapPhotonFeature(f: PhotonFeature, asVenue: boolean): PlaceResult | undefined {
  const p = f.properties;
  if (!p.name) return undefined;
  const [lng, lat] = f.geometry.coordinates;
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  return compact({
    name: p.name,
    coords: { lat, lng },
    country: p.country,
    countryCode: p.countrycode?.toUpperCase(),
    osmId: p.osm_type && p.osm_id ? osmRef(p.osm_type, p.osm_id) : undefined,
    city: asVenue ? p.city : undefined,
    address: asVenue
      ? [street, [p.postcode, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : undefined,
    venueKind: asVenue ? venueKindFromOsm(p.osm_key, p.osm_value) : undefined,
  });
}

function url(path: string, params: Array<[string, string]>) {
  return `${BASE}${path}?${new URLSearchParams(params).toString()}`;
}

async function features(path: string, params: Array<[string, string]>, ctx: ProviderContext) {
  // Photon is a free community service: keep the request rate low.
  return (await fetchJson<PhotonResponse>('photon', url(path, params), ctx, { minIntervalMs: 350 }))
    .features;
}

const lang = (ctx: ProviderContext): [string, string] => ['lang', ctx.locale];
const near = (c?: Coords): Array<[string, string]> =>
  c
    ? [
        ['lat', String(c.lat)],
        ['lon', String(c.lng)],
      ]
    : [];

export const photonProvider: PlaceSearchProvider = {
  async searchCities(q, ctx) {
    const result = await features(
      '/api/',
      [['q', q], ['limit', '8'], ['layer', 'city'], lang(ctx)],
      ctx,
    );
    return result.flatMap((f) => mapPhotonFeature(f, false) ?? []);
  },

  async searchVenues(q, ctx, center) {
    const tags = VENUE_TAGS.map((t): [string, string] => ['osm_tag', t]);
    const result = await features(
      '/api/',
      [['q', q], ['limit', '10'], lang(ctx), ...tags, ...near(center)],
      ctx,
    );
    return result.flatMap((f) => mapPhotonFeature(f, true) ?? []);
  },

  async reverseCity(coords, ctx) {
    const result = await features('/reverse', [...near(coords), ['layer', 'city'], lang(ctx)], ctx);
    return result[0] ? mapPhotonFeature(result[0], false) : undefined;
  },

  async reverseVenue(coords, ctx) {
    const tags = VENUE_TAGS.map((t): [string, string] => ['osm_tag', t]);
    const result = await features(
      '/reverse',
      [...near(coords), ['radius', '0.3'], lang(ctx), ...tags],
      ctx,
    );
    return result[0] ? mapPhotonFeature(result[0], true) : undefined;
  },
};
