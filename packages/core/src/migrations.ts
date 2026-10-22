import { SCHEMA_VERSION } from './model/common';
import { type EntityName, entityNames } from './model/registry';

export type RawRow = Record<string, unknown>;

export interface Migration {
  /** The schema version this step produces. */
  to: number;
  description: string;
  /** Pure per-row transforms. Tables without an entry only get their version bumped. */
  tables: Partial<Record<EntityName, (row: RawRow) => RawRow>>;
}

/**
 * Every change to persisted data, in order. The same steps run when IndexedDB upgrades, when an
 * older backup is imported and, later, when a sync server meets data from an older client.
 * Never edit a released step; append a new one and bump `SCHEMA_VERSION`.
 */
export const migrations: readonly Migration[] = [
  {
    to: 2,
    description: 'Collections hold typed item references instead of artwork ids',
    tables: {
      collections: ({ artworkIds, coverArtworkId, ...row }) => ({
        ...row,
        items: (Array.isArray(artworkIds) ? artworkIds : []).map((id) => ({ kind: 'artwork', id })),
        ...(typeof coverArtworkId === 'string'
          ? { coverItem: { kind: 'artwork', id: coverArtworkId } }
          : {}),
      }),
    },
  },
];

export class NewerSchemaError extends Error {
  constructor(readonly version: number) {
    super(`Data was written by a newer version of Mnemo (schema ${version} > ${SCHEMA_VERSION})`);
    this.name = 'NewerSchemaError';
  }
}

function versionOf(row: RawRow): number {
  return typeof row.schemaVersion === 'number' ? row.schemaVersion : 1;
}

/** Brings one stored row up to `target` (default: the current schema). */
export function migrateRow(table: EntityName, row: RawRow, target = SCHEMA_VERSION): RawRow {
  const from = versionOf(row);
  if (from > SCHEMA_VERSION) throw new NewerSchemaError(from);
  if (from >= target) return row;
  let next = row;
  for (const step of migrations) {
    if (step.to <= from || step.to > target) continue;
    next = step.tables[table]?.(next) ?? next;
  }
  return { ...next, schemaVersion: target };
}

/** Migrates every entity row of a raw object, e.g. the tables of an imported archive. */
export function migrateTables<T extends object>(raw: T): T {
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const table of entityNames) {
    const rows = out[table];
    if (!Array.isArray(rows)) continue;
    out[table] = rows.map((row) =>
      row && typeof row === 'object' ? migrateRow(table, row as RawRow) : row,
    );
  }
  return out as T;
}
