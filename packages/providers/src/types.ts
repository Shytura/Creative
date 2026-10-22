import type { Coords, VenueKind } from '@mnemo/core';

export type ProviderLocale = 'de' | 'en';

/** API keys entered by the user, keyed by `ProviderKeySpec.id`. */
export type ProviderKeys = Record<string, string | undefined>;

/** Declares that a provider only works with a free API key from the user. */
export interface ProviderKeySpec {
  /** Storage key in `ProviderKeys`; usually the provider id. */
  id: string;
  /** Where users can request a key. */
  signupUrl: string;
}

export interface ProviderContext {
  locale: ProviderLocale;
  keys?: ProviderKeys;
  signal?: AbortSignal;
  /** Injectable for tests and server-side use. */
  fetch?: typeof fetch;
}

// ── Art collections ────────────────────────────────────────────────────────

export interface ArtworkSearchResult {
  provider: string;
  externalId: string;
  title: string;
  artist?: string;
  year?: string;
  medium?: string;
  museumName?: string;
  /** Large image suitable for detail views and for storing offline. */
  imageUrl?: string;
  thumbnailUrl?: string;
  iiifInfoUrl?: string;
  url?: string;
  license?: string;
  credit?: string;
}

export interface ArtworkSearchProvider {
  id: string;
  name: string;
  homepage: string;
  /** Present when the provider only works with an API key from the settings. */
  requiresKey?: ProviderKeySpec;
  search(query: string, ctx: ProviderContext): Promise<ArtworkSearchResult[]>;
}

// ── Places & points of interest ────────────────────────────────────────────

export interface PlaceResult {
  name: string;
  coords: Coords;
  country?: string;
  countryCode?: string;
  /** `node/123`, `way/123` or `relation/123`. */
  osmId?: string;
  /** For venues: the city they are located in. */
  city?: string;
  address?: string;
  venueKind?: VenueKind;
}

export interface PlaceSearchProvider {
  searchCities(query: string, ctx: ProviderContext): Promise<PlaceResult[]>;
  searchVenues(query: string, ctx: ProviderContext, near?: Coords): Promise<PlaceResult[]>;
  /** Nearest city for coordinates, e.g. from photo EXIF data. */
  reverseCity(coords: Coords, ctx: ProviderContext): Promise<PlaceResult | undefined>;
  /** Nearest venue (museum, sight, …) for coordinates. */
  reverseVenue(coords: Coords, ctx: ProviderContext): Promise<PlaceResult | undefined>;
}

export interface PoiResult {
  osmId: string;
  name: string;
  kind: VenueKind;
  coords: Coords;
  website?: string;
  wikidataId?: string;
  wikipedia?: string;
  openingHours?: string;
  /** Higher means more notable; used for ranking suggestions. */
  score: number;
}

export interface PoiProvider {
  nearby(center: Coords, radiusMeters: number, ctx: ProviderContext): Promise<PoiResult[]>;
}

export interface WikiSummary {
  title: string;
  extract: string;
  imageUrl?: string;
  url: string;
}
