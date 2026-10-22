import { z } from 'zod';
import { migrateTables, NewerSchemaError } from './migrations';
import { type CollectibleBase, SCHEMA_VERSION } from './model/common';
import { type CollectibleKind, type ItemRef, mediaSchema } from './model/entities';
import { type EntityName, type EntityOf, entities, entityNames } from './model/registry';
import { emptySnapshot, type StoreSnapshot } from './repositories';

export const ARCHIVE_FORMAT = 'mnemo-archive';
/** Archives carry the schema version they were written with; older ones are migrated on import. */
export const ARCHIVE_VERSION = SCHEMA_VERSION;

/**
 * Portable export format. Backups ship blobs next to it (zip); shareable exports inline
 * thumbnails via `src` so a single JSON file is enough for the embeddable widget.
 */
export const archiveMediaSchema = mediaSchema.extend({
  /** Data URL or absolute URL usable directly in `<img src>`. */
  src: z.string().optional(),
});
export type ArchiveMedia = z.infer<typeof archiveMediaSchema>;

export type ArchiveTables = {
  [K in EntityName]: K extends 'media' ? ArchiveMedia[] : EntityOf<K>[];
};

export type Archive = {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  exportedAt: string;
} & ArchiveTables;

const envelopeSchema = z.object({
  format: z.literal(ARCHIVE_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
});

export const archiveSchema = envelopeSchema.extend(
  Object.fromEntries(
    entityNames.map((name) => [
      name,
      z.array(name === 'media' ? archiveMediaSchema : entities[name].schema).default([]),
    ]),
  ),
);

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

/** Validates an archive, migrating data written by older versions of Mnemo. */
export function parseArchive(input: unknown): Archive {
  const { version } = envelopeSchema.parse(input);
  if (version > ARCHIVE_VERSION) throw new NewerSchemaError(version);
  const migrated = { ...migrateTables(input as object, version), version: ARCHIVE_VERSION };
  return archiveSchema.parse(migrated) as unknown as Archive;
}

export function archiveToSnapshot(archive: Archive): StoreSnapshot {
  const { format: _format, version: _version, exportedAt: _exportedAt, ...tables } = archive;
  return { ...tables, media: archive.media.map(({ src: _src, ...m }) => m) };
}

/**
 * Narrows an archive to the given items and everything they reference, e.g. to share one list.
 */
export function subsetArchive(archive: Archive, items: readonly ItemRef[]): Archive {
  const keys = new Set(items.map((ref) => `${ref.kind}:${ref.id}`));
  const has = (ref: ItemRef) => keys.has(`${ref.kind}:${ref.id}`);

  const artworks = archive.artworks.filter((a) => has({ kind: 'artwork', id: a.id }));
  const books = archive.books.filter((b) => has({ kind: 'book', id: b.id }));
  // Listing every kind here makes adding a collectible type a compile error until handled.
  const collectibles = { artwork: artworks, book: books } satisfies Record<
    CollectibleKind,
    CollectibleBase[]
  >;
  const all = Object.values(collectibles).flat();

  // Every collectible brings its creators and media; artworks also the venues, places and
  // visits they were seen at.
  const venueIds = new Set(artworks.flatMap((a) => (a.venueId ? [a.venueId] : [])));
  const venues = archive.venues.filter((v) => venueIds.has(v.id));
  const placeIds = new Set(venues.map((v) => v.placeId));
  const creatorIds = new Set(all.flatMap((c) => c.creatorIds));
  const mediaIds = new Set(all.flatMap((c) => c.mediaIds));

  return {
    ...archive,
    ...emptySnapshot(),
    artworks,
    books,
    venues,
    places: archive.places.filter((p) => placeIds.has(p.id)),
    visits: archive.visits.filter((v) => venueIds.has(v.venueId)),
    creators: archive.creators.filter((c) => creatorIds.has(c.id)),
    collections: archive.collections
      .map((c) => ({
        ...c,
        items: c.items.filter(has),
        coverItem: c.coverItem && has(c.coverItem) ? c.coverItem : undefined,
      }))
      .filter((c) => c.items.length > 0),
    media: archive.media.filter((m) => mediaIds.has(m.id)),
  };
}
