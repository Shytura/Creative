import { z } from 'zod';
import {
  collectibleShape,
  coordsSchema,
  entityMetaShape,
  externalIdsShape,
  hexColorSchema,
  idSchema,
  isoDateSchema,
  sourceSchema,
} from './common';

// ── Collectible kinds ──────────────────────────────────────────────────────

/**
 * Every entity type that can be collected into lists. Adding a type means adding it here and
 * mapping it to its table in `registry.ts`.
 */
export const collectibleKinds = ['artwork', 'book'] as const;
export const collectibleKindSchema = z.enum(collectibleKinds);
export type CollectibleKind = z.infer<typeof collectibleKindSchema>;

/** A typed pointer to any collectible, used by lists and other cross-type references. */
export const itemRefSchema = z.object({ kind: collectibleKindSchema, id: idSchema });
export type ItemRef = z.infer<typeof itemRefSchema>;

// ── Place: a city or town ──────────────────────────────────────────────────

export const placeDraftSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().default(''),
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  coords: coordsSchema.optional(),
  coverMediaId: idSchema.optional(),
  notes: z.string().default(''),
  ...externalIdsShape,
});
export const placeSchema = placeDraftSchema.extend(entityMetaShape);
export type PlaceDraft = z.input<typeof placeDraftSchema>;
export type Place = z.infer<typeof placeSchema>;

// ── Venue: museum, gallery or sight inside a place ─────────────────────────

export const venueKinds = [
  'museum',
  'gallery',
  'sight',
  'church',
  'castle',
  'park',
  'other',
] as const;
export const venueKindSchema = z.enum(venueKinds);
export type VenueKind = z.infer<typeof venueKindSchema>;

export const venueDraftSchema = z.object({
  placeId: idSchema,
  kind: venueKindSchema.default('museum'),
  name: z.string().trim().min(1),
  coords: coordsSchema.optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().default(''),
  ...externalIdsShape,
});
export const venueSchema = venueDraftSchema.extend(entityMetaShape);
export type VenueDraft = z.input<typeof venueDraftSchema>;
export type Venue = z.infer<typeof venueSchema>;

// ── Visit: being at a venue on a given day ─────────────────────────────────

export const visitDraftSchema = z.object({
  venueId: idSchema,
  date: isoDateSchema,
  endDate: isoDateSchema.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().default(''),
  mediaIds: z.array(idSchema).default([]),
  companions: z.array(z.string()).default([]),
});
export const visitSchema = visitDraftSchema.extend(entityMetaShape);
export type VisitDraft = z.input<typeof visitDraftSchema>;
export type Visit = z.infer<typeof visitSchema>;

// ── Creator: a person behind works (artists today, authors later) ─────────

export const creatorDraftSchema = z.object({
  name: z.string().trim().min(1),
  /** Negative for years BCE. */
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  /** Short description, e.g. from Wikidata: "Dutch painter". */
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().default(''),
  ...externalIdsShape,
});
export const creatorSchema = creatorDraftSchema.extend(entityMetaShape);
export type CreatorDraft = z.input<typeof creatorDraftSchema>;
export type Creator = z.infer<typeof creatorSchema>;

// ── Artwork ────────────────────────────────────────────────────────────────

export const artworkStatuses = ['seen', 'wishlist'] as const;
export const artworkStatusSchema = z.enum(artworkStatuses);
export type ArtworkStatus = z.infer<typeof artworkStatusSchema>;

export const artworkSourceSchema = sourceSchema.extend({
  /** IIIF Image API `info.json`, enables deep zoom. */
  iiifInfoUrl: z.string().optional(),
  museumName: z.string().optional(),
});
export type ArtworkSource = z.infer<typeof artworkSourceSchema>;

export const artworkDraftSchema = z.object({
  ...collectibleShape,
  /**
   * Attribution as the museum writes it, e.g. `Workshop of Rubens`. The people behind it are
   * linked through `creatorIds`.
   */
  artist: z.string().optional(),
  /** Display date as written by the museum, e.g. `c. 1868–73`. */
  year: z.string().optional(),
  medium: z.string().optional(),
  status: artworkStatusSchema.default('seen'),
  venueId: idSchema.optional(),
  visitId: idSchema.optional(),
  source: artworkSourceSchema.optional(),
});
export const artworkSchema = artworkDraftSchema.extend(entityMetaShape);
export type ArtworkDraft = z.input<typeof artworkDraftSchema>;
export type Artwork = z.infer<typeof artworkSchema>;

// ── Book: a title in the personal library ──────────────────────────────────

export const bookStatuses = ['unread', 'reading', 'read', 'abandoned'] as const;
export const bookStatusSchema = z.enum(bookStatuses);
export type BookStatus = z.infer<typeof bookStatusSchema>;

/** Whether the book is on the user's shelf; independent of the reading status. */
export const bookOwnerships = ['owned', 'wishlist', 'borrowed'] as const;
export const bookOwnershipSchema = z.enum(bookOwnerships);
export type BookOwnership = z.infer<typeof bookOwnershipSchema>;

export const bookFormats = ['hardcover', 'paperback', 'ebook', 'audiobook'] as const;
export const bookFormatSchema = z.enum(bookFormats);
export type BookFormat = z.infer<typeof bookFormatSchema>;

/** One pass through a book; a reading without end date is the current one. */
export const readingSchema = z.object({
  startedOn: isoDateSchema.optional(),
  finishedOn: isoDateSchema.optional(),
  abandonedOn: isoDateSchema.optional(),
});
export type Reading = z.infer<typeof readingSchema>;

export const quoteSchema = z.object({
  id: idSchema,
  text: z.string().trim().min(1),
  page: z.number().int().positive().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
});
export type Quote = z.infer<typeof quoteSchema>;

/** An owned book currently lent to someone. */
export const loanSchema = z.object({
  name: z.string().trim().min(1),
  since: isoDateSchema,
  due: isoDateSchema.optional(),
});
export type Loan = z.infer<typeof loanSchema>;

export const bookDraftSchema = z.object({
  ...collectibleShape,
  subtitle: z.string().optional(),
  /** Authors as printed on the book; the people behind them are linked through `creatorIds`. */
  authors: z.array(z.string()).default([]),
  /** ISBN-13 without hyphens; ISBN-10 is converted on input. */
  isbn: z
    .string()
    .regex(/^97[89]\d{10}$/, 'Expected ISBN-13')
    .optional(),
  publisher: z.string().optional(),
  /** Publication year as printed, e.g. `1927` or `1927/2004`. */
  year: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  /** ISO 639-1 code, e.g. `de`. */
  language: z.string().optional(),
  format: bookFormatSchema.optional(),
  description: z.string().optional(),
  status: bookStatusSchema.default('unread'),
  ownership: bookOwnershipSchema.default('owned'),
  rating: z.number().int().min(1).max(5).optional(),
  currentPage: z.number().int().nonnegative().optional(),
  readings: z.array(readingSchema).default([]),
  quotes: z.array(quoteSchema).default([]),
  loan: loanSchema.optional(),
  source: sourceSchema.optional(),
  ...externalIdsShape,
});
export const bookSchema = bookDraftSchema.extend(entityMetaShape);
export type BookDraft = z.input<typeof bookDraftSchema>;
export type Book = z.infer<typeof bookSchema>;

// ── Collection: a user-curated, ordered list of collectibles of any kind ───

export const collectionDraftSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(''),
  coverItem: itemRefSchema.optional(),
  items: z.array(itemRefSchema).default([]),
});
export const collectionSchema = collectionDraftSchema.extend(entityMetaShape);
export type CollectionDraft = z.input<typeof collectionDraftSchema>;
export type Collection = z.infer<typeof collectionSchema>;

// ── Trip: an idea or plan for a future journey ─────────────────────────────

export const tripStatuses = ['idea', 'planned', 'done'] as const;
export const tripStatusSchema = z.enum(tripStatuses);
export type TripStatus = z.infer<typeof tripStatusSchema>;

export const tripItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: venueKindSchema.default('sight'),
  placeId: idSchema.optional(),
  /** Set once the item is linked to (or turned into) a venue of the user. */
  venueId: idSchema.optional(),
  coords: coordsSchema.optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().default(''),
  done: z.boolean().default(false),
  ...externalIdsShape,
});
export type TripItemDraft = z.input<typeof tripItemSchema>;
export type TripItem = z.infer<typeof tripItemSchema>;

export const tripDraftSchema = z.object({
  title: z.string().trim().min(1),
  status: tripStatusSchema.default('idea'),
  placeIds: z.array(idSchema).default([]),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  notes: z.string().default(''),
  coverImageUrl: z.string().optional(),
  /** Ordered by priority, most important first. */
  items: z.array(tripItemSchema).default([]),
});
export const tripSchema = tripDraftSchema.extend(entityMetaShape);
export type TripDraft = z.input<typeof tripDraftSchema>;
export type Trip = z.infer<typeof tripSchema>;

// ── Media: metadata of an image; binary data lives in the media repository ─

export const mediaDraftSchema = z.object({
  mime: z.string().default('image/jpeg'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Set when the image is only referenced, not stored locally. */
  remoteUrl: z.string().optional(),
  /** True when full-size and thumbnail blobs are stored locally. */
  hasBlob: z.boolean().default(false),
  palette: z.array(hexColorSchema).default([]),
  alt: z.string().optional(),
  takenAt: z.string().optional(),
  takenCoords: coordsSchema.optional(),
});
export const mediaSchema = mediaDraftSchema.extend(entityMetaShape);
export type MediaDraft = z.input<typeof mediaDraftSchema>;
export type Media = z.infer<typeof mediaSchema>;
