import { normalizeName } from '../lib/misc';
import type { Artwork, ArtworkDraft, Creator, CreatorDraft } from '../model/entities';
import type { MnemoStore } from '../repositories';
import { collectibleRepositories } from './collections';

/** Returns the creator matching by Wikidata id or name, or creates it. */
export async function ensureCreator(store: MnemoStore, draft: CreatorDraft): Promise<Creator> {
  const creators = await store.creators.list();
  const name = normalizeName(draft.name);
  const match =
    (draft.wikidataId && creators.find((c) => c.wikidataId === draft.wikidataId)) ||
    creators.find((c) => normalizeName(c.name) === name);
  return match ?? store.creators.create(draft);
}

const sameNames = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((name, i) => normalizeName(name) === normalizeName(b[i]!));

/**
 * Keeps creator links in step with an attribution (one artist, several authors, …). Unchanged
 * names keep their links, so creators can be renamed or unlinked without the next save undoing
 * it; a changed list reuses the links of names it still contains and links (or creates) the rest.
 */
export async function resolveCreatorIds(
  store: MnemoStore,
  names: readonly string[],
  previous?: { names: readonly string[]; creatorIds: readonly string[] },
): Promise<string[]> {
  const cleaned = names.map((n) => n.trim()).filter((n) => normalizeName(n));
  if (previous && sameNames(cleaned, previous.names)) return [...previous.creatorIds];
  const kept = new Map<string, string>(
    previous && previous.names.length === previous.creatorIds.length
      ? previous.names.map((n, i) => [normalizeName(n), previous.creatorIds[i]!])
      : [],
  );
  const ids: string[] = [];
  for (const name of cleaned) {
    ids.push(kept.get(normalizeName(name)) ?? (await ensureCreator(store, { name })).id);
  }
  return [...new Set(ids)];
}

/** Creates or updates an artwork and links its creator from the `artist` attribution. */
export async function saveArtwork(
  store: MnemoStore,
  draft: ArtworkDraft,
  id?: string,
): Promise<Artwork> {
  const existing = id ? await store.artworks.get(id) : undefined;
  const artist = draft.artist?.trim();
  const creatorIds =
    draft.creatorIds ??
    (await resolveCreatorIds(
      store,
      artist ? [artist] : [],
      existing && {
        names: existing.artist ? [existing.artist] : [],
        creatorIds: existing.creatorIds,
      },
    ));
  const next = { ...draft, artist: artist || undefined, creatorIds };
  return id ? store.artworks.update(id, next) : store.artworks.create(next);
}

/** Deletes a creator; their works stay and keep the attribution text. */
export async function removeCreator(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    for (const { repository } of collectibleRepositories(store)) {
      for (const item of await repository.list()) {
        if (item.creatorIds.includes(id)) {
          await repository.update(item.id, { creatorIds: item.creatorIds.filter((c) => c !== id) });
        }
      }
    }
    await store.creators.delete(id);
  });
}

/**
 * Merges creators that share a name (e.g. after importing someone else's export). The record
 * linked to Wikidata, or else the oldest, wins and inherits the others' works.
 */
export async function mergeDuplicateCreators(store: MnemoStore): Promise<number> {
  return store.transaction(async () => {
    const groups = new Map<string, Creator[]>();
    for (const c of await store.creators.list()) {
      const key = normalizeName(c.name);
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const replace = new Map<string, string>();
    for (const group of groups.values()) {
      const linked = new Set(group.flatMap((c) => (c.wikidataId ? [c.wikidataId] : [])));
      if (group.length < 2 || linked.size > 1) continue;
      const [keep, ...rest] = [...group].sort(
        (a, b) =>
          Number(!a.wikidataId) - Number(!b.wikidataId) || a.createdAt.localeCompare(b.createdAt),
      );
      for (const c of rest) replace.set(c.id, keep!.id);
    }
    if (replace.size === 0) return 0;
    for (const { repository } of collectibleRepositories(store)) {
      for (const item of await repository.list()) {
        if (!item.creatorIds.some((id) => replace.has(id))) continue;
        const creatorIds = [...new Set(item.creatorIds.map((id) => replace.get(id) ?? id))];
        await repository.update(item.id, { creatorIds });
      }
    }
    for (const id of replace.keys()) await store.creators.delete(id);
    return replace.size;
  });
}
