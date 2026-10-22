import { normalizeName } from './lib/misc';
import { SCHEMA_VERSION } from './model/common';
import { type EntityName, entityNames } from './model/registry';

export type RawRow = Record<string, unknown>;
export type RawTables = Partial<Record<EntityName, RawRow[]>>;

export interface Migration {
  /** The schema version this step produces. */
  to: number;
  description: string;
  /** Pure per-row transforms. Tables without an entry only get their version bumped. */
  tables: Partial<Record<EntityName, (row: RawRow) => RawRow>>;
  /**
   * Optional step across tables, run after the row transforms when the data set is older than
   * `to`. Receives all rows and returns the rows to add or replace (matched by id). It must be
   * idempotent and deterministic, because it can meet partially migrated data.
   */
  dataset?: (tables: RawTables) => RawTables;
}

/** Stable id for a creator derived from a name, so repeated imports reuse the same record. */
export function creatorIdFor(name: string): string | undefined {
  const slug = normalizeName(name).replaceAll(' ', '-');
  return slug ? `creator-${slug}` : undefined;
}

/** Creates a creator for every artist attribution that is not linked yet. */
function linkArtistsToCreators(tables: RawTables): RawTables {
  const creators = new Map<string, RawRow>();
  for (const c of tables.creators ?? []) {
    if (typeof c.name === 'string') creators.set(normalizeName(c.name), c);
  }
  const added: RawRow[] = [];
  const artworks: RawRow[] = [];
  for (const artwork of tables.artworks ?? []) {
    const artist = typeof artwork.artist === 'string' ? artwork.artist.trim() : '';
    const linked = Array.isArray(artwork.creatorIds) && artwork.creatorIds.length > 0;
    const id = creatorIdFor(artist);
    if (!artist || linked || !id) continue;
    let creator = creators.get(normalizeName(artist));
    if (!creator) {
      creator = {
        id,
        name: artist,
        notes: '',
        createdAt: artwork.createdAt,
        updatedAt: artwork.createdAt,
        schemaVersion: 3,
      };
      creators.set(normalizeName(artist), creator);
      added.push(creator);
    }
    artworks.push({ ...artwork, creatorIds: [creator.id] });
  }
  return { creators: added, artworks };
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
  {
    to: 3,
    description: 'People: artworks link to creators; existing artists become creators',
    tables: {
      artworks: (row) => ({ creatorIds: [], ...row }),
    },
    dataset: linkArtistsToCreators,
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

/** Adds or replaces rows by id. */
export function upsertRows(rows: readonly RawRow[], changes: readonly RawRow[]): RawRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const change of changes) byId.set(change.id, change);
  return [...byId.values()];
}

/**
 * Migrates every entity table of a raw object, e.g. an imported archive written with schema
 * `fromVersion`. Steps run in order: row transforms first, then the step's data set transform.
 */
export function migrateTables<T extends object>(raw: T, fromVersion: number): T {
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  const tables = () =>
    Object.fromEntries(
      entityNames.flatMap((n) => (Array.isArray(out[n]) ? [[n, out[n]]] : [])),
    ) as RawTables;

  for (const step of migrations) {
    for (const table of entityNames) {
      const rows = out[table];
      if (!Array.isArray(rows)) continue;
      out[table] = rows.map((row) =>
        row && typeof row === 'object' ? migrateRow(table, row as RawRow, step.to) : row,
      );
    }
    if (step.dataset && fromVersion < step.to) {
      for (const [table, changes] of Object.entries(step.dataset(tables()))) {
        out[table] = upsertRows((out[table] as RawRow[] | undefined) ?? [], changes ?? []);
      }
    }
  }
  return out as T;
}
