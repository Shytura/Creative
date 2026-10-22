import {
  ensurePlace,
  ensureVenue,
  type MnemoStore,
  normalizeName,
  type Place,
  type Venue,
} from '@mnemo/core';
import {
  type PlaceResult,
  type PoiResult,
  type ProviderContext,
  photonProvider,
} from '@mnemo/providers';

/** Creates (or reuses) a place from a city search result. */
export function importCity(store: MnemoStore, city: PlaceResult): Promise<Place> {
  return ensurePlace(store, {
    name: city.name,
    country: city.country ?? '',
    countryCode: city.countryCode,
    coords: city.coords,
    osmId: city.osmId,
  });
}

/**
 * Resolves the city of a venue result. Photon only returns the city name for venues, so the
 * city itself is geocoded once to get proper coordinates; the venue position is the fallback.
 */
async function cityForVenue(
  store: MnemoStore,
  venue: PlaceResult,
  ctx: ProviderContext,
): Promise<Place> {
  const cityName = venue.city ?? venue.name;
  const existing = (await store.places.list()).find(
    (p) =>
      normalizeName(p.name) === normalizeName(cityName) &&
      (p.countryCode ?? '') === (venue.countryCode ?? ''),
  );
  if (existing) return existing;
  try {
    const cities = await photonProvider.searchCities(cityName, ctx);
    const match = cities.find((c) => c.countryCode === venue.countryCode) ?? cities[0];
    if (match && normalizeName(match.name) === normalizeName(cityName))
      return importCity(store, match);
  } catch {
    // Offline or rate-limited: fall back to the venue coordinates below.
  }
  return ensurePlace(store, {
    name: cityName,
    country: venue.country ?? '',
    countryCode: venue.countryCode,
    coords: venue.coords,
  });
}

export async function importVenue(
  store: MnemoStore,
  result: PlaceResult,
  ctx: ProviderContext,
): Promise<Venue> {
  const place = await cityForVenue(store, result, ctx);
  return ensureVenue(store, {
    placeId: place.id,
    name: result.name,
    kind: result.venueKind ?? 'museum',
    coords: result.coords,
    address: result.address,
    osmId: result.osmId,
  });
}

export function importPoi(store: MnemoStore, placeId: string, poi: PoiResult): Promise<Venue> {
  return ensureVenue(store, {
    placeId,
    name: poi.name,
    kind: poi.kind,
    coords: poi.coords,
    website: poi.website,
    osmId: poi.osmId,
    wikidataId: poi.wikidataId,
    wikipedia: poi.wikipedia,
  });
}
