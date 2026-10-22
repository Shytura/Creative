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

// ── Books ──────────────────────────────────────────────────────────────────

export interface BookSearchResult {
  provider: string;
  externalId: string;
  title: string;
  subtitle?: string;
  /** Display names, e.g. `Thomas Mann`. */
  authors: string[];
  /** ISBN-13 without hyphens. */
  isbn?: string;
  publisher?: string;
  year?: string;
  pageCount?: number;
  /** ISO 639-1, e.g. `de`. */
  language?: string;
  description?: string;
  coverUrl?: string;
  url?: string;
}

export interface BookSearchProvider {
  id: string;
  name: string;
  homepage: string;
  requiresKey?: ProviderKeySpec;
  /** False when covers can be shown but not stored offline (no CORS on the image host). */
  storableCovers?: boolean;
  search(query: string, ctx: ProviderContext): Promise<BookSearchResult[]>;
  /** The edition with this ISBN-13, if the catalogue knows it. */
  byIsbn(isbn: string, ctx: ProviderContext): Promise<BookSearchResult | undefined>;
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

// ── People ─────────────────────────────────────────────────────────────────

export interface PersonResult {
  wikidataId: string;
  name: string;
  description?: string;
  /** Negative for years BCE. */
  birthYear?: number;
  deathYear?: number;
  imageUrl?: string;
  /** Wikipedia article as `lang:Title`. */
  wikipedia?: string;
  url: string;
}

/** Looks up artists, authors and other people behind works. */
export interface PeopleProvider {
  id: string;
  name: string;
  homepage: string;
  search(query: string, ctx: ProviderContext): Promise<PersonResult[]>;
  get(id: string, ctx: ProviderContext): Promise<PersonResult | undefined>;
}

export interface WikiSummary {
  title: string;
  extract: string;
  imageUrl?: string;
  url: string;
}
