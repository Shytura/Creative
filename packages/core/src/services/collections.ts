import type { CollectibleKind, Collection, ItemRef } from '../model/entities';
import type { MnemoStore } from '../repositories';

/** Lists work across all collectible kinds; these helpers keep callers kind-agnostic. */

export const sameItem = (a: ItemRef, b: ItemRef) => a.kind === b.kind && a.id === b.id;

export function collectionHas(collection: Collection, ref: ItemRef): boolean {
  return collection.items.some((item) => sameItem(item, ref));
}

/** Ids of one kind in list order. */
export function itemIdsOf(collection: Collection, kind: CollectibleKind): string[] {
  return collection.items.flatMap((item) => (item.kind === kind ? [item.id] : []));
}

export async function toggleInCollection(
  store: MnemoStore,
  collectionId: string,
  ref: ItemRef,
): Promise<void> {
  const collection = await store.collections.get(collectionId);
  if (!collection) return;
  await store.collections.update(collectionId, {
    items: collectionHas(collection, ref)
      ? collection.items.filter((item) => !sameItem(item, ref))
      : [...collection.items, ref],
  });
}

/** Sets membership of one item across all lists, e.g. from a form with list checkboxes. */
export async function setCollectionsOf(
  store: MnemoStore,
  ref: ItemRef,
  collectionIds: ReadonlySet<string>,
): Promise<void> {
  for (const c of await store.collections.list()) {
    const has = collectionHas(c, ref);
    const wants = collectionIds.has(c.id);
    if (has !== wants) await toggleInCollection(store, c.id, ref);
  }
}

/** Removes an item from every list, e.g. before it is deleted. */
export async function unlinkFromCollections(store: MnemoStore, ref: ItemRef): Promise<void> {
  for (const c of await store.collections.list()) {
    if (!collectionHas(c, ref)) continue;
    await store.collections.update(c.id, {
      items: c.items.filter((item) => !sameItem(item, ref)),
      coverItem: c.coverItem && sameItem(c.coverItem, ref) ? undefined : c.coverItem,
    });
  }
}
