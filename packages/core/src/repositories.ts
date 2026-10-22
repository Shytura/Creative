import type { Media, MediaDraft } from './model/entities';
import { type DraftOf, type EntityName, type EntityOf, entityNames } from './model/registry';
import type { Settings, SettingsPatch } from './model/settings';

/**
 * Persistence contract for one entity type. Implementations decide where data lives
 * (IndexedDB, REST, …); UI code depends on this interface only.
 */
export interface EntityRepository<T, TDraft> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  create(draft: TDraft): Promise<T>;
  update(id: string, patch: Partial<TDraft>): Promise<T>;
  delete(id: string): Promise<void>;
}

export type MediaVariant = 'full' | 'thumb';

export interface MediaBlobs {
  full?: Blob;
  thumb?: Blob;
}

export interface MediaRepository {
  get(id: string): Promise<Media | undefined>;
  list(): Promise<Media[]>;
  create(draft: MediaDraft, blobs?: MediaBlobs): Promise<Media>;
  update(id: string, patch: Partial<MediaDraft>, blobs?: MediaBlobs): Promise<Media>;
  getBlob(id: string, variant: MediaVariant): Promise<Blob | undefined>;
  delete(id: string): Promise<void>;
  /** Approximate bytes used by stored blobs. */
  usage(): Promise<number>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: SettingsPatch): Promise<Settings>;
}

/** Every entity of a store, used for backup, export and sync. */
export type StoreSnapshot = { [K in EntityName]: EntityOf<K>[] };

export type EntityTable = EntityName | 'settings';

/** One repository per registered entity type; media has its own contract because of blobs. */
export type EntityRepositories = {
  [K in Exclude<EntityName, 'media'>]: EntityRepository<EntityOf<K>, DraftOf<K>>;
};

export interface MnemoStore extends EntityRepositories {
  media: MediaRepository;
  settings: SettingsRepository;

  /** Runs `fn` atomically where the backend supports it. */
  transaction<R>(fn: () => Promise<R>): Promise<R>;
  /** Notifies about any data change, including changes made in other tabs. */
  subscribe(listener: (tables: EntityTable[]) => void): () => void;

  snapshot(): Promise<StoreSnapshot>;
  /** Writes a snapshot. `replace` clears existing data first, `merge` upserts by id. */
  restore(
    snapshot: StoreSnapshot,
    blobs: Map<string, MediaBlobs>,
    mode: 'merge' | 'replace',
  ): Promise<void>;
  /** Deletes all entities and media; settings are kept. */
  clear(): Promise<void>;
}

/** A snapshot with every table empty. */
export function emptySnapshot(): StoreSnapshot {
  return Object.fromEntries(entityNames.map((n) => [n, []])) as unknown as StoreSnapshot;
}
