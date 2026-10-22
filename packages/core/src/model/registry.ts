import type { z } from 'zod';
import {
  artworkDraftSchema,
  artworkSchema,
  type CollectibleKind,
  collectionDraftSchema,
  collectionSchema,
  creatorDraftSchema,
  creatorSchema,
  mediaDraftSchema,
  mediaSchema,
  placeDraftSchema,
  placeSchema,
  tripDraftSchema,
  tripSchema,
  venueDraftSchema,
  venueSchema,
  visitDraftSchema,
  visitSchema,
} from './entities';

export interface EntityDefinition {
  /** The persisted shape, including id and timestamps. */
  schema: z.ZodType;
  /** What callers pass to `create()`; defaults are applied from here. */
  draftSchema: z.ZodType;
}

/**
 * Single source of truth for all persisted entity types. Store contract, snapshots, archives,
 * backups and storage backends are derived from it. To add a type: define its schemas in
 * `entities.ts`, register it here, then add a migration and its storage indexes.
 */
export const entities = {
  places: { schema: placeSchema, draftSchema: placeDraftSchema },
  venues: { schema: venueSchema, draftSchema: venueDraftSchema },
  visits: { schema: visitSchema, draftSchema: visitDraftSchema },
  artworks: { schema: artworkSchema, draftSchema: artworkDraftSchema },
  collections: { schema: collectionSchema, draftSchema: collectionDraftSchema },
  trips: { schema: tripSchema, draftSchema: tripDraftSchema },
  creators: { schema: creatorSchema, draftSchema: creatorDraftSchema },
  media: { schema: mediaSchema, draftSchema: mediaDraftSchema },
} as const satisfies Record<string, EntityDefinition>;

export type EntityName = keyof typeof entities;
export type EntityOf<K extends EntityName> = z.infer<(typeof entities)[K]['schema']>;
export type DraftOf<K extends EntityName> = z.input<(typeof entities)[K]['draftSchema']>;

export const entityNames = Object.keys(entities) as EntityName[];

/** The table holding each collectible kind. */
export const collectibleTables = {
  artwork: 'artworks',
} as const satisfies Record<CollectibleKind, EntityName>;
