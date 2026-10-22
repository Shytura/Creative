import type { CollectibleKind, CollectibleOf, ItemRef } from '@mnemo/core';

import type { ComponentType, CSSProperties } from 'react';

export interface CollectibleCardProps<K extends CollectibleKind> {
  item: CollectibleOf<K>;
  className?: string;
  style?: CSSProperties;
}

/**
 * How a collectible kind appears in views that span kinds: people pages, mixed lists and,
 * later, search. Each module registers the views of the kinds it owns (`AppModule.collectibles`).
 */
export interface CollectibleView<K extends CollectibleKind> {
  /** A card for uniform grids, linking to the item's page. */
  Card: ComponentType<CollectibleCardProps<K>>;
  /** The item's page, for links built outside the card. */
  href: (id: string) => string;
}

export type CollectibleViews = { [K in CollectibleKind]: CollectibleView<K> };

/** An item of any kind with its reference, as lists and people pages hold them. */
export type AnyCollectible = {
  [K in CollectibleKind]: { ref: ItemRef & { kind: K }; item: CollectibleOf<K> };
}[CollectibleKind];

type ById = { [K in CollectibleKind]: Map<string, CollectibleOf<K>> };

/** Looks up list items across kinds, in list order; deleted items are skipped. */
export function resolveItems(
  refs: readonly ItemRef[],
  collectibles: { [K in CollectibleKind]: CollectibleOf<K>[] },
): AnyCollectible[] {
  const byId = Object.fromEntries(
    Object.entries(collectibles).map(([kind, items]) => [
      kind,
      new Map(items.map((item) => [item.id, item])),
    ]),
  ) as ById;
  return refs.flatMap((ref) => {
    const item = byId[ref.kind].get(ref.id);
    return item ? [{ ref, item } as AnyCollectible] : [];
  });
}
