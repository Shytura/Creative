import { normalizeName } from '../lib/misc';
import type { Artwork, ArtworkDraft, Creator, CreatorDraft } from '../model/entities';
import type { MnemoStore } from '../repositories';

/** Returns the creator matching by Wikidata id or name, or creates it. */
export async function ensureCreator(store: MnemoStore, draft: CreatorDraft): Promise<Creator> {
  const creators = await store.creators.list();
  const name = normalizeName(draft.name);
  const match =
    (draft.wikidataId && creators.find((c) => c.wikidataId === draft.wikidataId)) ||
    creators.find((c) => normalizeName(c.name) === name);
  return match ?? store.creators.create(draft);
}

/**
 * Creates or updates an artwork and keeps its creator links in step with the attribution: a
 * changed `artist` links (or creates) the matching creator; an unchanged one keeps the links,
 * so creators can be renamed without losing their works.
 */
export async function saveArtwork(
  store: MnemoStore,
  draft: ArtworkDraft,
  id?: string,
): Promise<Artwork> {
  const existing = id ? await store.artworks.get(id) : undefined;
  const artist = draft.artist?.trim();
  let creatorIds = draft.creatorIds;
  if (!creatorIds) {
    const unchanged =
      existing && normalizeName(existing.artist ?? '') === normalizeName(artist ?? '');
    creatorIds = unchanged
      ? existing.creatorIds
      : artist
        ? [(await ensureCreator(store, { name: artist })).id]
        : [];
  }
  const next = { ...draft, artist: artist || undefined, creatorIds };
  return id ? store.artworks.update(id, next) : store.artworks.create(next);
}

/** Deletes a creator; their works stay and keep the attribution text. */
export async function removeCreator(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    for (const a of await store.artworks.list()) {
      if (a.creatorIds.includes(id)) {
        await store.artworks.update(a.id, { creatorIds: a.creatorIds.filter((c) => c !== id) });
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
    for (const a of await store.artworks.list()) {
      if (!a.creatorIds.some((id) => replace.has(id))) continue;
      const creatorIds = [...new Set(a.creatorIds.map((id) => replace.get(id) ?? id))];
      await store.artworks.update(a.id, { creatorIds });
    }
    for (const id of replace.keys()) await store.creators.delete(id);
    return replace.size;
  });
}
