import type { CollectibleKind } from '@mnemo/core';
import type { ComponentType, CSSProperties } from 'react';
import type { AnyCollectible, CollectibleCardProps } from '../app/collectibles';
import { collectibleViews } from '../modules';

/** The card of any collectible kind, as registered by the module that owns the kind. */
export function CollectibleCard({
  entry,
  className,
  style,
}: {
  entry: AnyCollectible;
  className?: string;
  style?: CSSProperties;
}) {
  const Card = collectibleViews[entry.ref.kind].Card as ComponentType<
    CollectibleCardProps<CollectibleKind>
  >;
  return <Card item={entry.item} className={className} style={style} />;
}
