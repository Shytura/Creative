import {
  type EntityName,
  type EntityOf,
  entityNames,
  type Migration,
  migrateRow,
  migrations,
  type RawTables,
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
  3: {
    artworks: 'id, venueId, visitId, status, createdAt, *creatorIds',
    creators: 'id, name, wikidataId',
  },
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
        .upgrade((tx) => upgradeTo(tx, step));
    }
  }

  /** Typed access to the table of a registered entity. */
  entity<K extends EntityName>(name: K): Table<EntityOf<K>, string> {
    return this.table(name);
  }
}

/** Tables that exist in IndexedDB at a given version (`null` in `STORES` deletes one). */
function tablesAt(version: number): Set<string> {
  const tables = new Set<string>();
  for (const [v, stores] of Object.entries(STORES)) {
    if (Number(v) > version) continue;
    for (const [name, spec] of Object.entries(stores)) {
      if (spec === null) tables.delete(name);
      else tables.add(name);
    }
  }
  return tables;
}

/** Runs one core migration step over the stored data. */
async function upgradeTo(tx: Transaction, step: Migration) {
  const names = entityNames.filter((name) => tablesAt(step.to).has(name));
  for (const name of names) {
    await tx
      .table(name)
      .toCollection()
      .modify((row, ctx) => {
        ctx.value = migrateRow(name, row, step.to);
      });
  }
  if (!step.dataset) return;
  const tables: RawTables = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await tx.table(name).toArray()] as const)),
  );
  for (const [name, rows] of Object.entries(step.dataset(tables))) {
    if (rows?.length) await tx.table(name).bulkPut(rows);
  }
}
