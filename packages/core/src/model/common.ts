import { z } from 'zod';

/** Bumped whenever the persisted shape of an entity changes; enables migrations and sync. */
export const SCHEMA_VERSION = 1;

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
