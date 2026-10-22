import { z } from 'zod';

/**
 * Bumped whenever the persisted data changes shape or a table is added. Each bump comes with an
 * entry in `migrations.ts` (and a matching IndexedDB version in `@mnemo/storage-dexie`).
 */
export const SCHEMA_VERSION = 2;

export const idSchema = z.string().min(1);

/** Calendar date without time, e.g. `2024-05-17`. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected #rrggbb');

export const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coords = z.infer<typeof coordsSchema>;

export const entityMetaShape = {
  id: idSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(SCHEMA_VERSION),
};

export interface EntityMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

/** Stable references into open datasets, used for de-duplication and enrichment. */
export const externalIdsShape = {
  osmId: z.string().optional(),
  wikidataId: z.string().optional(),
  /** Wikipedia article as `lang:Title`, the same format OpenStreetMap uses. */
  wikipedia: z.string().optional(),
};

/** Where a collectible came from, e.g. a museum API or a library catalogue. */
export const sourceSchema = z.object({
  /** Provider id from `@mnemo/providers`, e.g. `aic`, `met`, `wikidata`. */
  provider: z.string(),
  externalId: z.string(),
  url: z.string().optional(),
  license: z.string().optional(),
  credit: z.string().optional(),
});

/**
 * Fields every collectible type shares (artworks today, books and more later). Shared services
 * such as lists, favourites, tags and colour search rely only on these.
 */
export const collectibleShape = {
  title: z.string().trim().min(1),
  favorite: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().default(''),
  mediaIds: z.array(idSchema).default([]),
  /** Dominant colours of the primary image, most prominent first. */
  palette: z.array(hexColorSchema).default([]),
};
