import {
  createId,
  defaultSettings,
  type EntityMeta,
  type EntityName,
  type EntityRepositories,
  type EntityRepository,
  type EntityTable,
  entities,
  entityNames,
  type MediaBlobs,
  type MediaRepository,
  type MnemoStore,
  mediaDraftSchema,
  mediaSchema,
  nowIso,
  SCHEMA_VERSION,
  type SettingsRepository,
  type StoreSnapshot,
  settingsSchema,
} from '@mnemo/core';
import { Dexie, type Table } from 'dexie';
import { type MediaBlobRow, MnemoDatabase } from './db';

interface Parser<T> {
  parse(input: unknown): T;
}

export class NotFoundError extends Error {
  constructor(table: string, id: string) {
    super(`${table}/${id} not found`);
    this.name = 'NotFoundError';
  }
}

function entityRepository<T extends EntityMeta, TDraft>(
  table: Table<T, string>,
  draftSchema: Parser<Omit<T, keyof EntityMeta>>,
  schema: Parser<T>,
): EntityRepository<T, TDraft> {
  return {
    get: (id) => table.get(id),
    list: () => table.toArray(),
    async create(draft) {
      const timestamp = nowIso();
      const entity = {
        ...draftSchema.parse(draft),
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: SCHEMA_VERSION,
      } as T;
      await table.add(entity);
      return entity;
    },
    async update(id, patch) {
      const existing = await table.get(id);
      if (!existing) throw new NotFoundError(table.name, id);
      const next = schema.parse({ ...existing, ...patch, id, updatedAt: nowIso() });
      await table.put(next);
      return next;
    },
    async delete(id) {
      await table.delete(id);
    },
  };
}

function mediaRepository(db: MnemoDatabase): MediaRepository {
  const media = db.entity('media');
  const putBlobs = async (id: string, blobs?: MediaBlobs) => {
    if (blobs && (blobs.full || blobs.thumb)) await db.mediaBlobs.put({ id, ...blobs });
  };
  return {
    get: (id) => media.get(id),
    list: () => media.toArray(),
    async create(draft, blobs) {
      const timestamp = nowIso();
      const entity = mediaSchema.parse({
        ...mediaDraftSchema.parse(draft),
        hasBlob: Boolean(blobs?.full || blobs?.thumb),
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await db.transaction('rw', media, db.mediaBlobs, async () => {
        await media.add(entity);
        await putBlobs(entity.id, blobs);
      });
      return entity;
    },
    async update(id, patch, blobs) {
      return db.transaction('rw', media, db.mediaBlobs, async () => {
        const existing = await media.get(id);
        if (!existing) throw new NotFoundError('media', id);
        const next = mediaSchema.parse({
          ...existing,
          ...patch,
          hasBlob: existing.hasBlob || Boolean(blobs?.full || blobs?.thumb),
          id,
          updatedAt: nowIso(),
        });
        await media.put(next);
        await putBlobs(id, blobs);
        return next;
      });
    },
    async getBlob(id, variant) {
      const row = await db.mediaBlobs.get(id);
      return variant === 'thumb' ? (row?.thumb ?? row?.full) : (row?.full ?? row?.thumb);
    },
    async delete(id) {
      await db.transaction('rw', media, db.mediaBlobs, async () => {
        await media.delete(id);
        await db.mediaBlobs.delete(id);
      });
    },
    async usage() {
      let bytes = 0;
      await db.mediaBlobs.each((row) => {
        bytes += (row.full?.size ?? 0) + (row.thumb?.size ?? 0);
      });
      return bytes;
    },
  };
}

function settingsRepository(db: MnemoDatabase): SettingsRepository {
  const read = async () => {
    const row = await db.settings.get('settings');
    if (!row) return defaultSettings;
    const { id: _id, ...settings } = row;
    const parsed = settingsSchema.safeParse(settings);
    return parsed.success ? parsed.data : defaultSettings;
  };
  return {
    get: read,
    async update(patch) {
      const next = settingsSchema.parse({ ...(await read()), ...patch });
      await db.settings.put({ ...next, id: 'settings' });
      return next;
    },
  };
}

/** Entity tables with a plain repository; media has its own because of blobs. */
const REPOSITORY_TABLES = entityNames.filter(
  (n): n is Exclude<EntityName, 'media'> => n !== 'media',
);

export interface DexieStore extends MnemoStore {
  /** Escape hatch for advanced queries and debugging. */
  db: MnemoDatabase;
  close(): void;
}

/** Creates a Mnemo store persisted in IndexedDB under `name`. */
export function createDexieStore(name = 'mnemo'): DexieStore {
  const db = new MnemoDatabase(name);

  const repositories = Object.fromEntries(
    REPOSITORY_TABLES.map((name) => [
      name,
      entityRepository(db.entity(name), entities[name].draftSchema, entities[name].schema),
    ]),
  ) as unknown as EntityRepositories;

  const store: DexieStore = {
    db,
    ...repositories,
    media: mediaRepository(db),
    settings: settingsRepository(db),

    transaction: (fn) => db.transaction('rw', db.tables, fn),

    subscribe(listener) {
      const prefix = `idb://${name}/`;
      const handler = (parts: Record<string, unknown>) => {
        const tables = new Set<EntityTable>();
        for (const key of Object.keys(parts)) {
          if (!key.startsWith(prefix)) continue;
          const table = key.slice(prefix.length).split('/')[0];
          if (table === 'mediaBlobs') tables.add('media');
          else if (table) tables.add(table as EntityTable);
        }
        if (tables.size > 0) listener([...tables]);
      };
      Dexie.on.storagemutated.subscribe(handler);
      return () => Dexie.on.storagemutated.unsubscribe(handler);
    },

    async snapshot() {
      return db.transaction(
        'r',
        entityNames.map((t) => db.entity(t)),
        async () => {
          const entries = await Promise.all(
            entityNames.map(async (t) => [t, await db.entity(t).toArray()] as const),
          );
          return Object.fromEntries(entries) as unknown as StoreSnapshot;
        },
      );
    },

    async restore(snapshot, blobs, mode) {
      const tables = entityNames.map((t) => db.entity(t));
      await db.transaction('rw', [...tables, db.mediaBlobs], async () => {
        if (mode === 'replace') {
          await Promise.all([...tables.map((t) => t.clear()), db.mediaBlobs.clear()]);
        }
        for (const name of REPOSITORY_TABLES) {
          await (db.entity(name) as Table<EntityMeta, string>).bulkPut(snapshot[name]);
        }
        const storedBlobIds = new Set(await db.mediaBlobs.toCollection().primaryKeys());
        await db.entity('media').bulkPut(
          snapshot.media.map((m) => ({
            ...m,
            hasBlob: blobs.has(m.id) || storedBlobIds.has(m.id),
          })),
        );
        const rows: MediaBlobRow[] = [...blobs].map(([id, b]) => ({ id, ...b }));
        await db.mediaBlobs.bulkPut(rows);
      });
    },

    async clear() {
      const tables = [...entityNames.map((t) => db.entity(t)), db.mediaBlobs];
      await db.transaction('rw', tables, () => Promise.all(tables.map((t) => t.clear())));
    },

    close: () => db.close(),
  };
  return store;
}
