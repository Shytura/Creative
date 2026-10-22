import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { type Trip, type TripStatus, tripStatuses } from '@mnemo/core';
import { Button, cn, EmptyState, PageHeader, SectionTitle } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CalendarIcon, PlusIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtworks, useLookups, useTrips } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { Flag } from '../../components/bits';
import { useWikiSummary } from '../../components/WikiSummary';
import { useFormat } from '../../lib/format';

export function PlannerPage() {
  const { t } = useTranslation();
  const store = useStore();
  const dialogs = useDialogs();
  const trips = useTrips();
  const artworks = useArtworks();
  const wishlist = (artworks ?? []).filter((a) => a.status === 'wishlist');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const status = over?.id as TripStatus | undefined;
    const trip = trips?.find((x) => x.id === active.id);
    if (trip && status && trip.status !== status) void store.trips.update(trip.id, { status });
  };

  return (
    <>
      <PageHeader
        eyebrow={t('planner.eyebrowPage')}
        title={t('planner.pageTitle')}
        lede={t('planner.lede')}
        actions={
          <Button onClick={() => dialogs.open({ type: 'trip' })}>
            <PlusIcon /> {t('planner.new')}
          </Button>
        }
      />

      {trips && trips.length === 0 ? (
        <EmptyState
          title={t('planner.emptyTitle')}
          description={t('planner.emptyText')}
          action={
            <Button onClick={() => dialogs.open({ type: 'trip' })}>
              <PlusIcon /> {t('planner.new')}
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {tripStatuses.map((status) => (
              <Column
                key={status}
                status={status}
                trips={(trips ?? []).filter((x) => x.status === status)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {wishlist.length > 0 && (
        <section className="mt-24">
          <SectionTitle
            action={
              <Link
                to="/collection"
                search={{ status: 'wishlist' }}
                className="eyebrow inline-flex items-center gap-1.5 text-ink-3 hover:text-accent"
              >
                {t('common.showAll')} <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            {t('planner.wishlist')}
          </SectionTitle>
          <p className="caption -mt-2 mb-8 text-lg text-ink-3">{t('planner.wishlistText')}</p>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-6">
            {wishlist.slice(0, 12).map((a) => (
              <ArtworkCard key={a.id} artwork={a} crop />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Column({ status, trips }: { status: TripStatus; trips: Trip[] }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`planner.status.${status}`)}
      className={cn(
        'min-h-64 rounded-frame border border-transparent p-1 transition-colors',
        isOver && 'border-dashed border-accent bg-accent-soft',
      )}
    >
      <header className="mb-5 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="display text-2xl font-[420]">{t(`planner.status.${status}`)}</h2>
        <span className="text-sm text-ink-3 tabular-nums">{trips.length}</span>
      </header>
      <div className="space-y-5">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {trips.length === 0 && (
          <p className="caption py-8 text-center text-ink-3">{t('planner.dropHere')}</p>
        )}
      </div>
    </section>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { places } = useLookups();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: trip.id,
  });
  const first = trip.placeIds[0] ? places.get(trip.placeIds[0]) : undefined;
  const summary = useWikiSummary(first?.wikipedia, first?.wikipedia ? undefined : first?.name);
  const image = trip.coverImageUrl ?? summary.data?.imageUrl;
  const done = trip.items.filter((i) => i.done).length;
  // A drag ends with a click on the link underneath; swallow that one click.
  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) dragged.current = true;
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      className={cn('touch-none', isDragging && 'relative z-20 rotate-1 opacity-90')}
    >
      <Link
        to="/trip/$tripId"
        params={{ tripId: trip.id }}
        onClick={(e) => {
          if (dragged.current) {
            e.preventDefault();
            dragged.current = false;
          }
        }}
        draggable={false}
        className={cn(
          'group block overflow-hidden rounded-frame border border-line bg-surface shadow-soft transition-shadow hover:shadow-frame',
          isDragging && 'shadow-float',
        )}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-paper-2">
          {image && (
            <img
              src={image}
              alt=""
              draggable={false}
              className="size-full object-cover transition-transform duration-700 ease-gallery group-hover:scale-105"
            />
          )}
        </div>
        <div className="space-y-2 p-5">
          <p className="display text-2xl font-[420] group-hover:text-accent">{trip.title}</p>
          <p className="flex flex-wrap gap-x-3 text-xs text-ink-3">
            {trip.placeIds.map((id) => (
              <span key={id}>
                <Flag code={places.get(id)?.countryCode} /> {places.get(id)?.name}
              </span>
            ))}
          </p>
          <div className="flex items-center justify-between pt-2 text-xs text-ink-3">
            <span className="flex items-center gap-1.5">
              {trip.startDate && (
                <>
                  <CalendarIcon className="size-3.5" /> {format.date(trip.startDate, 'medium')}
                </>
              )}
            </span>
            <span className="tabular-nums">
              {t('planner.progress', { done, total: trip.items.length })}
            </span>
          </div>
          {trip.items.length > 0 && (
            <div className="h-0.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-accent transition-[width] duration-700"
                style={{ width: `${(done / trip.items.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
