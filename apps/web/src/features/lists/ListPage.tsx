import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Collection, collectibleKinds, type ItemRef, itemIdsOf, sameItem } from '@mnemo/core';
import { Button, cn, EmptyState, PageHeader } from '@mnemo/ui';
import { getRouteApi } from '@tanstack/react-router';
import { GripVerticalIcon, PencilIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { type AnyCollectible, resolveItems } from '../../app/collectibles';
import { type CollectiblesByKind, useCollectibles, useCollections } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { CollectibleCard } from '../../components/CollectibleCard';

const routeApi = getRouteApi('/list/$collectionId');
const keyOf = (ref: ItemRef) => `${ref.kind}:${ref.id}`;

/** A list in its own order, whatever kinds it holds; items can be dragged into place. */
export function ListPage() {
  const { t } = useTranslation();
  const { collectionId } = routeApi.useParams();
  const dialogs = useDialogs();
  const collections = useCollections();
  const collectibles = useCollectibles();

  if (!collections || !collectibles) return null;
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return <EmptyState title={t('lists.notFound')} />;

  const counts = collectibleKinds
    .map((kind) => ({ kind, count: itemIdsOf(collection, kind).length }))
    .filter((c) => c.count > 0)
    .map(({ kind, count }) => t(`kinds.${kind}.count`, { count }))
    .join(' · ');

  return (
    <>
      <PageHeader
        eyebrow={counts ? `${t('lists.eyebrow')} · ${counts}` : t('lists.eyebrow')}
        title={collection.name}
        lede={collection.description || undefined}
        actions={
          <Button
            variant="outline"
            onClick={() => dialogs.open({ type: 'collection', collectionId: collection.id })}
          >
            <PencilIcon /> {t('common.edit')}
          </Button>
        }
      />
      {collection.items.length === 0 ? (
        <EmptyState title={t('lists.emptyTitle')} description={t('lists.emptyText')} />
      ) : (
        <SortableItems collection={collection} collectibles={collectibles} />
      )}
    </>
  );
}

function SortableItems({
  collection,
  collectibles,
}: {
  collection: Collection;
  collectibles: CollectiblesByKind;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const stored = useMemo(
    () => resolveItems(collection.items, collectibles),
    [collection.items, collectibles],
  );
  // Local order while dragging, so the grid does not jump back until the store has saved.
  const [entries, setEntries] = useState(stored);
  useEffect(() => setEntries(stored), [stored]);
  const ids = useMemo(() => entries.map((e) => keyOf(e.ref)), [entries]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(entries, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setEntries(next);
    void store.collections.update(collection.id, { items: next.map((e) => e.ref) });
  };

  const remove = async (ref: ItemRef) => {
    await store.collections.update(collection.id, {
      items: collection.items.filter((item) => !sameItem(item, ref)),
      coverItem:
        collection.coverItem && sameItem(collection.coverItem, ref)
          ? undefined
          : collection.coverItem,
    });
    toast.success(t('lists.removed'));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ol className="mt-12 grid grid-cols-2 items-start gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map((entry) => (
            <SortableEntry
              key={keyOf(entry.ref)}
              entry={entry}
              onRemove={() => remove(entry.ref)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableEntry({ entry, onRemove }: { entry: AnyCollectible; onRemove: () => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: keyOf(entry.ref),
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group/entry relative', isDragging && 'z-10 opacity-80')}
    >
      <CollectibleCard entry={entry} />
      <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 transition-opacity group-hover/entry:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t('lists.reorder')}
          className="grid size-7 cursor-grab touch-none place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur"
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('lists.remove')}
          className="grid size-7 cursor-pointer place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
