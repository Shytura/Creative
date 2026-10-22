import {
  type EntityName,
  type EntityOf,
  entityNames,
  migrateRow,
  migrations,
  type Settings,
} from '@mnemo/core';
import { Dexie, type Table, type Transaction } from 'dexie';

export interface MediaBlobRow {
  id: string;
  full?: Blob;
  thumb?: Blob;
}

export type SettingsRow = Settings & { id: 'settings' };

/**
 * IndexedDB indexes per schema version; only indexed fields are listed, everything else is
 * stored as-is. Dexie versions follow `SCHEMA_VERSION`: every step in `migrations` needs an
 * entry here, listing only what changes (`{}` when no index changes). Never edit released ones.
 */
export const STORES: Readonly<Record<number, Record<string, string | null>>> = {
  1: {
    places: 'id, name, countryCode',
    venues: 'id, placeId, name',
    visits: 'id, venueId, date',
    artworks: 'id, venueId, visitId, status, createdAt',
    collections: 'id',
    trips: 'id, status',
    media: 'id',
    mediaBlobs: 'id',
    settings: 'id',
  },
  2: {},
};

export class MnemoDatabase extends Dexie {
  mediaBlobs!: Table<MediaBlobRow, string>;
  settings!: Table<SettingsRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores(STORES[1]!);
    for (const step of migrations) {
      const stores = STORES[step.to];
      if (!stores) throw new Error(`No IndexedDB schema for version ${step.to}`);
      this.version(step.to)
        .stores(stores)
        .upgrade((tx) => upgradeTo(tx, step.to));
    }
  }

  /** Typed access to the table of a registered entity. */
  entity<K extends EntityName>(name: K): Table<EntityOf<K>, string> {
    return this.table(name);
  }
}

/** Runs the core migration step for `version` over every stored row. */
async function upgradeTo(tx: Transaction, version: number) {
  for (const name of entityNames) {
    if (!tx.storeNames.includes(name)) continue;
    await tx
      .table(name)
      .toCollection()
      .modify((row, ctx) => {
        ctx.value = migrateRow(name, row, version);
      });
  }
}
