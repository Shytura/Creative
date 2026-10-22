import type {
  Artwork,
  ArtworkDraft,
  Collection,
  CollectionDraft,
  Media,
  MediaDraft,
  Place,
  PlaceDraft,
  Trip,
  TripDraft,
  Venue,
  VenueDraft,
  Visit,
  VisitDraft,
} from './model/entities';
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
export interface StoreSnapshot {
  places: Place[];
  venues: Venue[];
  visits: Visit[];
  artworks: Artwork[];
  collections: Collection[];
  trips: Trip[];
  media: Media[];
}

export type EntityTable = keyof StoreSnapshot | 'settings';

export interface MnemoStore {
  places: EntityRepository<Place, PlaceDraft>;
  venues: EntityRepository<Venue, VenueDraft>;
  visits: EntityRepository<Visit, VisitDraft>;
  artworks: EntityRepository<Artwork, ArtworkDraft>;
  collections: EntityRepository<Collection, CollectionDraft>;
  trips: EntityRepository<Trip, TripDraft>;
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
}
