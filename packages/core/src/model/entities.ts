import { z } from 'zod';
import {
  coordsSchema,
  entityMetaShape,
  externalIdsShape,
  hexColorSchema,
  idSchema,
  isoDateSchema,
} from './common';

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

// ── Artwork ────────────────────────────────────────────────────────────────

export const artworkStatuses = ['seen', 'wishlist'] as const;
export const artworkStatusSchema = z.enum(artworkStatuses);
export type ArtworkStatus = z.infer<typeof artworkStatusSchema>;

export const artworkSourceSchema = z.object({
  /** Provider id from `@mnemo/providers`, e.g. `aic`, `met`, `wikidata`. */
  provider: z.string(),
  externalId: z.string(),
  url: z.string().optional(),
  license: z.string().optional(),
  credit: z.string().optional(),
  /** IIIF Image API `info.json`, enables deep zoom. */
  iiifInfoUrl: z.string().optional(),
  museumName: z.string().optional(),
});
export type ArtworkSource = z.infer<typeof artworkSourceSchema>;

export const artworkDraftSchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().optional(),
  /** Display date as written by the museum, e.g. `c. 1868–73`. */
  year: z.string().optional(),
  medium: z.string().optional(),
  status: artworkStatusSchema.default('seen'),
  venueId: idSchema.optional(),
  visitId: idSchema.optional(),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().default(false),
  mediaIds: z.array(idSchema).default([]),
  /** Dominant colours of the primary image, most prominent first. */
  palette: z.array(hexColorSchema).default([]),
  source: artworkSourceSchema.optional(),
});
export const artworkSchema = artworkDraftSchema.extend(entityMetaShape);
export type ArtworkDraft = z.input<typeof artworkDraftSchema>;
export type Artwork = z.infer<typeof artworkSchema>;

// ── Collection: a user-curated, ordered list of artworks ───────────────────

export const collectionDraftSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(''),
  coverArtworkId: idSchema.optional(),
  artworkIds: z.array(idSchema).default([]),
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
