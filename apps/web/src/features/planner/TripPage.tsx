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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  bounds,
  completeTripItem,
  createId,
  type Place,
  type Trip,
  type TripItem,
  todayIsoDate,
  type VenueKind,
} from '@mnemo/core';
import { overpassProvider, type PoiResult } from '@mnemo/providers';
import {
  Button,
  Chip,
  cn,
  Dialog,
  DialogContent,
  EmptyState,
  Field,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SectionTitle,
  Segmented,
  Skeleton,
  Spinner,
  Textarea,
  Tooltip,
} from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookmarkCheckIcon,
  BookmarkPlusIcon,
  CalendarIcon,
  CheckIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-map-gl/maplibre';
import { toast } from 'sonner';
import { useArtworks, useLookups, useProviderContext, useTrips } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { ErrorNote, Flag, KindIcon } from '../../components/bits';
import { MapView } from '../../components/MapView';
import { RemoteImage } from '../../components/MediaImage';
import { CitySearch, VenuePicker } from '../../components/PlaceSearch';
import { useWikiSummary } from '../../components/WikiSummary';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/trip/$tripId');

export function TripPage() {
  const { t } = useTranslation();
  const { tripId } = routeApi.useParams();
  const trips = useTrips();
  const trip = trips?.find((x) => x.id === tripId);
  if (!trips) return <Skeleton className="aspect-[21/9]" />;
  if (!trip) return <EmptyState title={t('planner.notFound')} />;
  return <TripView trip={trip} />;
}

function TripView({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const store = useStore();
  const dialogs = useDialogs();
  const format = useFormat();
  const { places, venues } = useLookups();
  const artworks = useArtworks();
  const destinations = trip.placeIds.flatMap((id) => places.get(id) ?? []);
  const first = destinations[0];
  const cover = useWikiSummary(first?.wikipedia, first?.wikipedia ? undefined : first?.name);
  const [notes, setNotes] = useState(trip.notes);
  useEffect(() => setNotes(trip.notes), [trip.notes]);

  const setItems = (items: TripItem[]) => void store.trips.update(trip.id, { items });
  const addItem = (item: Omit<TripItem, 'id' | 'notes' | 'done'>) => {
    if (trip.items.some((i) => (item.osmId && i.osmId === item.osmId) || i.name === item.name))
      return;
    setItems([...trip.items, { id: createId(), notes: '', done: false, ...item }]);
    toast.success(t('planner.added', { name: item.name }));
  };

  const wishlistHere = (artworks ?? []).filter((a) => {
    const venue = a.status === 'wishlist' && a.venueId ? venues.get(a.venueId) : undefined;
    return venue && trip.placeIds.includes(venue.placeId);
  });

  const image = trip.coverImageUrl ?? cover.data?.imageUrl;

  return (
    <article>
      <Link
        to="/planner"
        className="eyebrow mb-8 inline-flex items-center gap-2 text-ink-3 hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" /> {t('nav.planner')}
      </Link>

      <header className="relative overflow-hidden rounded-frame bg-ink shadow-float">
        {image && (
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full animate-fade object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="relative flex min-h-[22rem] flex-col justify-end p-6 text-white md:min-h-[28rem] md:p-12">
          <div className="flex flex-wrap items-center gap-2">
            {destinations.map((p) => (
              <Link
                key={p.id}
                to="/place/$placeId"
                params={{ placeId: p.id }}
                className="eyebrow rounded-full bg-white/15 px-3 py-1.5 backdrop-blur hover:bg-white/25"
              >
                <Flag code={p.countryCode} /> {p.name}
              </Link>
            ))}
            <AddDestination trip={trip} />
          </div>
          <h1 className="display mt-5 text-[clamp(2.75rem,7vw,6rem)] font-[340]">{trip.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Segmented
              className="border-white/30 [&_[data-checked=false]]:text-white/80 [&_[data-checked=true]]:bg-white [&_[data-checked=true]]:text-ink"
              value={trip.status}
              onChange={(status) => void store.trips.update(trip.id, { status })}
              options={(['idea', 'planned', 'done'] as const).map((s) => ({
                value: s,
                label: t(`planner.status.${s}`),
              }))}
            />
            {trip.startDate && (
              <span className="flex items-center gap-2 text-sm text-white/80">
                <CalendarIcon className="size-4" /> {format.date(trip.startDate)}
                {trip.endDate && ` – ${format.date(trip.endDate)}`}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-white hover:bg-white/15 hover:text-white"
              onClick={() => dialogs.open({ type: 'trip', tripId: trip.id })}
            >
              <PencilIcon /> {t('common.edit')}
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section>
          <SectionTitle>{t('planner.list')}</SectionTitle>
          {trip.items.length === 0 ? (
            <p className="caption text-lg text-ink-3">{t('planner.listEmpty')}</p>
          ) : (
            <ItemList trip={trip} onChange={setItems} />
          )}
          {first && (
            <div className="mt-6">
              <p className="eyebrow mb-2 text-ink-3">{t('planner.addSpecific')}</p>
              <VenuePicker
                onSelect={(venue) =>
                  addItem({
                    name: venue.name,
                    kind: venue.kind,
                    placeId: venue.placeId,
                    venueId: venue.id,
                    coords: venue.coords,
                    osmId: venue.osmId,
                    wikipedia: venue.wikipedia,
                    wikidataId: venue.wikidataId,
                  })
                }
              />
            </div>
          )}
          <div className="mt-10">
            <p className="eyebrow mb-2 text-ink-3">{t('planner.notes')}</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== trip.notes && void store.trips.update(trip.id, { notes })}
              placeholder={t('planner.notesPlaceholder')}
              className="min-h-28 font-display text-base"
            />
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TripMap trip={trip} destinations={destinations} />
        </aside>
      </div>

      {wishlistHere.length > 0 && (
        <section className="mt-20">
          <SectionTitle>{t('planner.wishlistHere')}</SectionTitle>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            {wishlistHere.map((a) => (
              <ArtworkCard key={a.id} artwork={a} crop />
            ))}
          </div>
        </section>
      )}

      {destinations.length > 0 && (
        <Suggestions trip={trip} destinations={destinations} onAdd={addItem} />
      )}
    </article>
  );
}

function AddDestination({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const store = useStore();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="eyebrow cursor-pointer rounded-full border border-white/30 px-3 py-1.5 text-white/80 hover:bg-white/15"
        >
          <PlusIcon className="inline size-3" /> {t('planner.destination')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <CitySearch
          autoFocus
          onSelect={(place) => {
            if (!trip.placeIds.includes(place.id))
              void store.trips.update(trip.id, { placeIds: [...trip.placeIds, place.id] });
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ItemList({ trip, onChange }: { trip: Trip; onChange: (items: TripItem[]) => void }) {
  const [items, setLocal] = useState(trip.items);
  useEffect(() => setLocal(trip.items), [trip.items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [completing, setCompleting] = useState<TripItem | null>(null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      items,
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
    setLocal(next);
    onChange(next);
  };

  const update = (id: string, patch: Partial<TripItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ol className="divide-y divide-line border-y border-line">
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                item={item}
                index={index}
                onToggle={() =>
                  item.done ? update(item.id, { done: false }) : setCompleting(item)
                }
                onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
                onNotes={(notes) => update(item.id, { notes })}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {completing && (
        <CompleteDialog trip={trip} item={completing} onClose={() => setCompleting(null)} />
      )}
    </>
  );
}

function SortableItem({
  item,
  index,
  onToggle,
  onRemove,
  onNotes,
}: {
  item: TripItem;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
  onNotes: (notes: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative flex items-start gap-3 bg-paper py-4',
        isDragging && 'z-10 shadow-frame',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-ink-3 opacity-40 hover:opacity-100"
        aria-label={t('planner.reorder')}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.done}
        aria-label={item.done ? t('planner.markOpen') : t('planner.markDone')}
        className={cn(
          'mt-0.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors',
          item.done
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line-strong hover:border-accent',
        )}
      >
        {item.done ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <span className="text-[0.625rem] text-ink-3 tabular-nums">{index + 1}</span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <KindIcon kind={item.kind} className="shrink-0 text-ink-3" />
          {item.venueId ? (
            <Link
              to="/venue/$venueId"
              params={{ venueId: item.venueId }}
              className={cn(
                'truncate font-medium hover:text-accent',
                item.done && 'text-ink-3 line-through',
              )}
            >
              {item.name}
            </Link>
          ) : (
            <span className={cn('truncate font-medium', item.done && 'text-ink-3 line-through')}>
              {item.name}
            </span>
          )}
          {item.website && (
            <a
              href={item.website}
              target="_blank"
              rel="noreferrer"
              className="text-ink-3 hover:text-accent"
              aria-label={t('venue.website')}
            >
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          )}
        </div>
        {editing ? (
          <Input
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (notes !== item.notes) onNotes(notes);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="mt-2 h-8 text-xs"
            placeholder={t('planner.itemNotes')}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1 block cursor-text text-left text-xs text-ink-3 hover:text-ink-2"
          >
            {item.notes || (
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                {t('planner.itemNotes')}
              </span>
            )}
          </button>
        )}
      </div>
      <Tooltip content={t('common.remove')}>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 cursor-pointer text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
          aria-label={t('common.remove')}
        >
          <XIcon className="size-4" />
        </button>
      </Tooltip>
    </li>
  );
}

function CompleteDialog({
  trip,
  item,
  onClose,
}: {
  trip: Trip;
  item: TripItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const [date, setDate] = useState(
    trip.startDate && trip.startDate <= todayIsoDate() ? trip.startDate : todayIsoDate(),
  );
  const canRecord = Boolean(item.placeId ?? trip.placeIds[0]);

  const complete = async (withVisit: boolean) => {
    await completeTripItem(store, trip.id, item.id, withVisit ? date : undefined);
    if (withVisit) toast.success(t('planner.visitRecorded', { name: item.name }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="sm"
        eyebrow={t('planner.doneEyebrow')}
        title={item.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => void complete(false)}>
              {t('planner.justCheck')}
            </Button>
            <Button disabled={!canRecord || !date} onClick={() => void complete(true)}>
              {t('planner.recordVisit')}
            </Button>
          </>
        }
      >
        <p className="mb-5 text-sm text-ink-2">{t('planner.doneText')}</p>
        <Field label={t('visit.date')}>
          {(id) => (
            <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
      </DialogContent>
    </Dialog>
  );
}

function TripMap({ trip, destinations }: { trip: Trip; destinations: Place[] }) {
  const points = [
    ...trip.items.flatMap((i) => i.coords ?? []),
    ...destinations.flatMap((d) => d.coords ?? []),
  ];
  if (points.length === 0) return null;
  return (
    <MapView
      className="aspect-[4/3] rounded-frame shadow-frame"
      bounds={points.length > 1 ? bounds(points) : null}
      center={points[0]}
      zoom={12}
    >
      {trip.items.map(
        (item, index) =>
          item.coords && (
            <Marker key={item.id} longitude={item.coords.lng} latitude={item.coords.lat}>
              <span
                title={item.name}
                className={cn(
                  'grid size-6 place-items-center rounded-full border-2 border-surface text-[0.625rem] font-semibold shadow-frame',
                  item.done ? 'bg-ink-3 text-surface' : 'bg-accent text-accent-ink',
                )}
              >
                {index + 1}
              </span>
            </Marker>
          ),
      )}
    </MapView>
  );
}

const KIND_FILTERS: Array<VenueKind | 'all'> = [
  'all',
  'museum',
  'gallery',
  'sight',
  'church',
  'castle',
  'park',
];

function Suggestions({
  trip,
  destinations,
  onAdd,
}: {
  trip: Trip;
  destinations: Place[];
  onAdd: (item: Omit<TripItem, 'id' | 'notes' | 'done'>) => void;
}) {
  const { t } = useTranslation();
  const ctx = useProviderContext();
  const [placeId, setPlaceId] = useState(destinations[0]?.id);
  const [kind, setKind] = useState<VenueKind | 'all'>('all');
  const place = destinations.find((d) => d.id === placeId) ?? destinations[0];

  const pois = useQuery({
    queryKey: ['overpass', place?.id, place?.coords],
    queryFn: ({ signal }) => overpassProvider.nearby(place!.coords!, 5000, { ...ctx, signal }),
    enabled: Boolean(place?.coords),
    staleTime: 24 * 60 * 60_000,
    retry: 1,
  });

  const filtered = useMemo(
    () => (pois.data ?? []).filter((p) => kind === 'all' || p.kind === kind),
    [pois.data, kind],
  );
  const saved = new Set(trip.items.flatMap((i) => [i.osmId, i.name]));

  if (!place) return null;

  return (
    <section className="mt-24">
      <SectionTitle>{t('planner.suggestions', { place: place.name })}</SectionTitle>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {destinations.length > 1 &&
          destinations.map((d) => (
            <Chip key={d.id} active={d.id === place.id} onClick={() => setPlaceId(d.id)}>
              <Flag code={d.countryCode} /> {d.name}
            </Chip>
          ))}
        {destinations.length > 1 && <span className="mx-2 h-5 w-px bg-line" />}
        {KIND_FILTERS.map((k) => (
          <Chip
            key={k}
            active={kind === k}
            onClick={() => setKind(k)}
            leading={k !== 'all' ? <KindIcon kind={k} className="size-3.5" /> : undefined}
          >
            {k === 'all' ? t('collection.filterAll') : t(`venue.kindsPlural.${k}`)}
          </Chip>
        ))}
      </div>

      {!place.coords ? (
        <p className="caption text-ink-3">{t('planner.noCoords')}</p>
      ) : pois.isPending ? (
        <>
          <p className="caption mb-6 flex items-center gap-3 text-ink-3">
            <Spinner className="size-4" /> {t('planner.suggestionsLoading')}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => (
              <Skeleton key={k} className="aspect-[4/3]" />
            ))}
          </div>
        </>
      ) : pois.isError ? (
        <ErrorNote onRetry={() => void pois.refetch()}>{t('planner.suggestionsFailed')}</ErrorNote>
      ) : filtered.length === 0 ? (
        <p className="caption text-ink-3">{t('planner.noSuggestions')}</p>
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.slice(0, 40).map((poi) => (
            <SuggestionCard
              key={poi.osmId}
              poi={poi}
              saved={saved.has(poi.osmId) || saved.has(poi.name)}
              onAdd={() =>
                onAdd({
                  name: poi.name,
                  kind: poi.kind,
                  placeId: place.id,
                  coords: poi.coords,
                  osmId: poi.osmId,
                  wikidataId: poi.wikidataId,
                  wikipedia: poi.wikipedia,
                  website: poi.website,
                })
              }
            />
          ))}
        </div>
      )}
      <p className="mt-10 text-xs text-ink-3">{t('planner.osmCredit')}</p>
    </section>
  );
}

function SuggestionCard({
  poi,
  saved,
  onAdd,
}: {
  poi: PoiResult;
  saved: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const summary = useWikiSummary(poi.wikipedia);
  return (
    <article className="group flex flex-col">
      <div className="relative">
        <RemoteImage
          src={summary.data?.imageUrl}
          alt={poi.name}
          className="aspect-[4/3] shadow-soft"
        />
        {!summary.data?.imageUrl && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-ink-3/50">
            <KindIcon kind={poi.kind} className="size-10" />
          </div>
        )}
        <Button
          size="sm"
          variant={saved ? 'solid' : 'accent'}
          disabled={saved}
          onClick={onAdd}
          className="absolute right-3 bottom-3 rounded-full shadow-frame"
        >
          {saved ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
          {saved ? t('planner.remembered') : t('planner.remember')}
        </Button>
      </div>
      <p className="eyebrow mt-4 flex items-center gap-1.5 text-[0.625rem] text-ink-3">
        <KindIcon kind={poi.kind} className="size-3" /> {t(`venue.kinds.${poi.kind}`)}
      </p>
      <h3 className="display mt-1.5 text-xl font-[440]">{poi.name}</h3>
      {summary.data?.extract && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">
          {summary.data.extract}
        </p>
      )}
      {poi.openingHours && <p className="mt-2 text-xs text-ink-3">{poi.openingHours}</p>}
    </article>
  );
}
