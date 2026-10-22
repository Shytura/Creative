import { z } from 'zod';
import {
  artworkSchema,
  collectionSchema,
  mediaSchema,
  placeSchema,
  tripSchema,
  venueSchema,
  visitSchema,
} from './model/entities';
import type { StoreSnapshot } from './repositories';

export const ARCHIVE_FORMAT = 'mnemo-archive';
export const ARCHIVE_VERSION = 1;

/**
 * Portable export format. Backups ship blobs next to it (zip); shareable exports inline
 * thumbnails via `src` so a single JSON file is enough for the embeddable widget.
 */
export const archiveMediaSchema = mediaSchema.extend({
  /** Data URL or absolute URL usable directly in `<img src>`. */
  src: z.string().optional(),
});
export type ArchiveMedia = z.infer<typeof archiveMediaSchema>;

export const archiveSchema = z.object({
  format: z.literal(ARCHIVE_FORMAT),
  version: z.number().int().max(ARCHIVE_VERSION),
  exportedAt: z.string(),
  places: z.array(placeSchema).default([]),
  venues: z.array(venueSchema).default([]),
  visits: z.array(visitSchema).default([]),
  artworks: z.array(artworkSchema).default([]),
  collections: z.array(collectionSchema).default([]),
  trips: z.array(tripSchema).default([]),
  media: z.array(archiveMediaSchema).default([]),
});
export type Archive = z.infer<typeof archiveSchema>;

export function createArchive(
  snapshot: StoreSnapshot,
  mediaSrc?: (id: string) => string | undefined,
): Archive {
  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    ...snapshot,
    media: snapshot.media.map((m) => {
      const src = mediaSrc?.(m.id);
      return src ? { ...m, src } : m;
    }),
  };
}

export function parseArchive(input: unknown): Archive {
  return archiveSchema.parse(input);
}

export function archiveToSnapshot(archive: Archive): StoreSnapshot {
  const { places, venues, visits, artworks, collections, trips } = archive;
  const media = archive.media.map(({ src: _src, ...m }) => m);
  return { places, venues, visits, artworks, collections, trips, media };
}

/** Narrows an archive to the artworks of one collection (and everything they reference). */
export function subsetArchive(archive: Archive, artworkIds: Set<string>): Archive {
  const artworks = archive.artworks.filter((a) => artworkIds.has(a.id));
  const venueIds = new Set(artworks.flatMap((a) => (a.venueId ? [a.venueId] : [])));
  const venues = archive.venues.filter((v) => venueIds.has(v.id));
  const placeIds = new Set(venues.map((v) => v.placeId));
  const mediaIds = new Set(artworks.flatMap((a) => a.mediaIds));
  return {
    ...archive,
    artworks,
    venues,
    places: archive.places.filter((p) => placeIds.has(p.id)),
    visits: archive.visits.filter((v) => venueIds.has(v.venueId)),
    collections: archive.collections
      .map((c) => ({ ...c, artworkIds: c.artworkIds.filter((id) => artworkIds.has(id)) }))
      .filter((c) => c.artworkIds.length > 0),
    trips: [],
    media: archive.media.filter((m) => mediaIds.has(m.id)),
  };
}
