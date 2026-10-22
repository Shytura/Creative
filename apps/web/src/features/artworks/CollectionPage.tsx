import {
  type Artwork,
  type ArtworkFilter,
  epochs,
  facet,
  filterArtworks,
  paletteMatches,
} from '@mnemo/core';
import {
  Button,
  Chip,
  cn,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Segmented,
  Select,
  Swatch,
} from '@mnemo/ui';
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  FrameIcon,
  HeartIcon,
  LayoutGridIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { type DragEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtworks, useCollections, useLookups } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import type { CollectionSearch } from '../../app/router';
import { ArtworkCard } from '../../components/ArtworkCard';
import { MediaImage } from '../../components/MediaImage';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/collection');

/** Reference hues for the colour filter, tuned to typical pigments in paintings. */
const COLOR_FILTERS = [
  '#b23a2a',
  '#d07a2c',
  '#c9a43a',
  '#e3cf6e',
  '#6f7a3a',
  '#3f6e4a',
  '#2f6f74',
  '#2e4f8c',
  '#3a3266',
  '#7a3f74',
  '#d98a9a',
  '#7a4e2e',
  '#e8e0cc',
  '#1f1d1b',
];

export function CollectionPage() {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const artworks = useArtworks();
  const collections = useCollections();
  const lookups = useLookups();
  const [dragging, setDragging] = useState(false);

  const setSearch = (patch: Partial<CollectionSearch>) =>
    void navigate({
      search: (prev) =>
        Object.fromEntries(
          Object.entries({ ...prev, ...patch }).filter(([, v]) => v !== undefined && v !== ''),
        ),
      replace: true,
    });

  const results = useMemo(() => {
    const filter: ArtworkFilter = {
      query: search.q,
      status: search.status,
      favorite: search.fav,
      artist: search.artist,
      placeId: search.place,
      venueId: search.venue,
      tag: search.tag,
      epoch: search.epoch,
      color: search.color,
      collectionId: search.collection,
    };
    return filterArtworks(artworks ?? [], filter, {
      venues: lookups.venues,
      collections: collections ?? [],
    });
  }, [artworks, collections, lookups.venues, search]);

  const activeCollection = collections?.find((c) => c.id === search.collection);
  const view = search.view ?? 'gallery';
  const hasFilters = Boolean(
    search.q ||
      search.status ||
      search.fav ||
      search.artist ||
      search.place ||
      search.venue ||
      search.tag ||
      search.epoch ||
      search.color,
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) dialogs.open({ type: 'artwork', files });
  };

  if (artworks && artworks.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={t('collection.eyebrowPage')}
          title={t('collection.title')}
          lede={t('collection.lede')}
        />
        <EmptyState
          title={t('collection.emptyTitle')}
          description={t('collection.emptyText')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => dialogs.open({ type: 'artwork' })}>
                <PlusIcon /> {t('collection.addFirst')}
              </Button>
              <Button asChild variant="outline">
                <Link to="/discover">{t('collection.discover')}</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop target for image files
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
      className="relative"
    >
      <PageHeader
        eyebrow={t('collection.eyebrowPage')}
        title={activeCollection?.name ?? t('collection.title')}
        lede={activeCollection?.description || t('collection.lede')}
        actions={
          <>
            {activeCollection && (
              <Button
                variant="outline"
                onClick={() =>
                  dialogs.open({ type: 'collection', collectionId: activeCollection.id })
                }
              >
                <PencilIcon /> {t('common.edit')}
              </Button>
            )}
            <Button onClick={() => dialogs.open({ type: 'artwork' })}>
              <PlusIcon /> {t('collection.add')}
            </Button>
          </>
        }
      />

      <div className="-mx-1 mt-8 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={!search.collection} onClick={() => setSearch({ collection: undefined })}>
          {t('collection.all')}
        </Chip>
        {collections?.map((c) => (
          <Chip
            key={c.id}
            active={search.collection === c.id}
            onClick={() => setSearch({ collection: c.id })}
          >
            {c.name} <span className="opacity-50">{c.artworkIds.length}</span>
          </Chip>
        ))}
        <Chip onClick={() => dialogs.open({ type: 'collection' })} className="border-dashed">
          <PlusIcon className="size-3.5" /> {t('collection.new')}
        </Chip>
      </div>

      <Toolbar search={search} setSearch={setSearch} artworks={artworks ?? []} />

      <div className="mt-6 mb-8 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>{t('collection.count', { count: results.length })}</span>
        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            className="ml-2 text-ink-3"
            onClick={() =>
              void navigate({ search: { collection: search.collection, view: search.view } })
            }
          >
            {t('collection.reset')}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          title={t('collection.noMatchTitle')}
          description={t('collection.noMatchText')}
        />
      ) : view === 'wall' ? (
        <SalonWall artworks={results} />
      ) : view === 'list' ? (
        <ArtworkTable artworks={results} />
      ) : (
        <div className="masonry columns-2 gap-5 md:columns-3 md:gap-8 xl:columns-4">
          {results.map((a, i) => (
            <ArtworkCard
              key={a.id}
              artwork={a}
              className="mb-10 animate-rise"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            />
          ))}
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-4 z-30 grid place-items-center rounded-frame border-2 border-dashed border-accent bg-paper/80 backdrop-blur-sm">
          <p className="caption flex items-center gap-3 text-3xl text-ink">
            <UploadIcon className="size-7 text-accent" /> {t('collection.dropToAdd')}
          </p>
        </div>
      )}
    </div>
  );
}

function Toolbar({
  search,
  setSearch,
  artworks,
}: {
  search: CollectionSearch;
  setSearch: (patch: Partial<CollectionSearch>) => void;
  artworks: Artwork[];
}) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const [query, setQuery] = useState(search.q ?? '');

  const artists = useMemo(() => facet(artworks.map((a) => a.artist)), [artworks]);
  const tags = useMemo(() => facet(artworks.flatMap((a) => a.tags)), [artworks]);
  const places = useMemo(
    () => facet(artworks.map((a) => lookups.placeOfVenue(a.venueId)?.id)),
    [artworks, lookups],
  );
  const colors = useMemo(
    () => COLOR_FILTERS.filter((c) => artworks.some((a) => paletteMatches(a.palette, c))),
    [artworks],
  );
  const advancedCount = [search.artist, search.place, search.tag, search.epoch].filter(
    Boolean,
  ).length;

  return (
    <div className="mt-6 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center">
      <form
        className="relative lg:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ q: query.trim() || undefined });
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          type="search"
          value={query}
          placeholder={t('collection.searchPlaceholder')}
          aria-label={t('collection.searchPlaceholder')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === '') setSearch({ q: undefined });
          }}
          onBlur={() => setSearch({ q: query.trim() || undefined })}
          className="rounded-full pl-9"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          aria-label={t('artwork.form.status')}
          value={search.status ?? 'all'}
          onChange={(v) => setSearch({ status: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: t('collection.filterAll') },
            { value: 'seen', label: t('artwork.status.seen') },
            { value: 'wishlist', label: t('artwork.status.wishlist') },
          ]}
        />
        <Chip
          active={search.fav}
          onClick={() => setSearch({ fav: search.fav ? undefined : true })}
          leading={<HeartIcon className="size-3.5" />}
        >
          {t('collection.favorites')}
        </Chip>
        <Popover>
          <PopoverTrigger asChild>
            <Chip
              active={advancedCount > 0}
              leading={<SlidersHorizontalIcon className="size-3.5" />}
            >
              {t('collection.filters')}
              {advancedCount > 0 && ` · ${advancedCount}`}
            </Chip>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] space-y-5 p-5">
            <div className="space-y-2">
              <Label>{t('collection.epoch')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {epochs.map((e) => (
                  <Chip
                    key={e.id}
                    active={search.epoch === e.id}
                    onClick={() => setSearch({ epoch: search.epoch === e.id ? undefined : e.id })}
                  >
                    {t(`epochs.${e.id}`)}
                  </Chip>
                ))}
              </div>
            </div>
            <FacetSelect
              label={t('artwork.fields.artist')}
              value={search.artist}
              options={artists.map((a) => ({ value: a.value, label: `${a.value} (${a.count})` }))}
              onChange={(artist) => setSearch({ artist })}
            />
            <FacetSelect
              label={t('collection.city')}
              value={search.place}
              options={places.map((p) => ({
                value: p.value,
                label: `${lookups.places.get(p.value)?.name ?? '?'} (${p.count})`,
              }))}
              onChange={(place) => setSearch({ place })}
            />
            {tags.length > 0 && (
              <div className="space-y-2">
                <Label>{t('artwork.fields.tags')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Chip
                      key={tag.value}
                      active={search.tag === tag.value}
                      onClick={() =>
                        setSearch({ tag: search.tag === tag.value ? undefined : tag.value })
                      }
                    >
                      #{tag.value}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {colors.length > 0 && (
        <fieldset className="flex min-w-0 items-center gap-1.5">
          <legend className="sr-only">{t('collection.color')}</legend>
          {colors.map((c) => (
            <Swatch
              key={c}
              color={c}
              active={search.color === c}
              className="size-5"
              aria-label={c}
              onClick={() => setSearch({ color: search.color === c ? undefined : c })}
            />
          ))}
          {search.color && (
            <button
              type="button"
              onClick={() => setSearch({ color: undefined })}
              className="ml-1 cursor-pointer text-ink-3 hover:text-ink"
              aria-label={t('common.reset')}
            >
              <XIcon className="size-4" />
            </button>
          )}
        </fieldset>
      )}

      <Segmented
        className="lg:ml-auto"
        aria-label={t('collection.view')}
        value={search.view ?? 'gallery'}
        onChange={(view) => setSearch({ view: view === 'gallery' ? undefined : view })}
        options={[
          {
            value: 'gallery',
            label: <span className="sr-only">{t('collection.views.gallery')}</span>,
            icon: <LayoutGridIcon />,
          },
          {
            value: 'wall',
            label: <span className="sr-only">{t('collection.views.wall')}</span>,
            icon: <FrameIcon />,
          },
          {
            value: 'list',
            label: <span className="sr-only">{t('collection.views.list')}</span>,
            icon: <ListIcon />,
          },
        ]}
      />
    </div>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  const { t } = useTranslation();
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{t('collection.filterAll')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

const WALL_HEIGHTS = ['h-44', 'h-64', 'h-52', 'h-72', 'h-48', 'h-60'];

/** Salon-style hanging: framed works, densely packed on a coloured wall. */
function SalonWall({ artworks }: { artworks: Artwork[] }) {
  return (
    <div
      className="-mx-5 px-6 py-14 md:-mx-10 md:px-12"
      style={{ background: 'color-mix(in oklab, var(--mn-accent) 30%, #1d1a17)' }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-10">
        {artworks.map((a, i) => (
          <Link
            key={a.id}
            to="/artwork/$artworkId"
            params={{ artworkId: a.id }}
            className="group relative block transition-transform duration-500 ease-gallery hover:-translate-y-1"
            title={a.title}
          >
            <div className="border-[7px] border-[#3b2f22] bg-[#f6f1e7] p-3 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.65)] outline outline-1 outline-[#a8874f]/60 md:p-4">
              {a.mediaIds[0] ? (
                <MediaImage
                  mediaId={a.mediaIds[0]}
                  alt={a.title}
                  className={cn('w-auto', WALL_HEIGHTS[i % WALL_HEIGHTS.length])}
                  imgClassName="h-full w-auto object-contain"
                />
              ) : (
                <div
                  className={cn(
                    'grid w-36 place-items-center p-3 text-center',
                    WALL_HEIGHTS[i % WALL_HEIGHTS.length],
                  )}
                >
                  <span className="caption text-lg text-[#4b443c]">{a.title}</span>
                </div>
              )}
            </div>
            <span className="caption absolute inset-x-0 -bottom-7 truncate text-center text-xs text-white/0 transition-colors group-hover:text-white/80">
              {a.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArtworkTable({ artworks }: { artworks: Artwork[] }) {
  const { t } = useTranslation();
  const { venues, placeOfVenue } = useLookups();
  const format = useFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="eyebrow border-b border-line-strong text-ink-3">
            <th className="w-16 py-3 font-semibold" />
            <th className="py-3 font-semibold">{t('artwork.fields.title')}</th>
            <th className="py-3 font-semibold">{t('artwork.fields.artist')}</th>
            <th className="py-3 font-semibold">{t('artwork.fields.year')}</th>
            <th className="py-3 font-semibold">{t('artwork.fields.venue')}</th>
            <th className="py-3 text-right font-semibold">{t('artwork.fields.added')}</th>
          </tr>
        </thead>
        <tbody>
          {artworks.map((a) => {
            const venue = a.venueId ? venues.get(a.venueId) : undefined;
            const place = placeOfVenue(a.venueId);
            return (
              <tr
                key={a.id}
                className="group border-b border-line transition-colors hover:bg-ink/3"
              >
                <td className="py-2.5 pr-3">
                  <MediaImage mediaId={a.mediaIds[0]} alt="" className="size-12" />
                </td>
                <td className="py-2.5 pr-4">
                  <Link
                    to="/artwork/$artworkId"
                    params={{ artworkId: a.id }}
                    className="caption text-base group-hover:text-accent"
                  >
                    {a.title}
                  </Link>
                  {a.favorite && (
                    <HeartIcon className="ml-2 inline size-3.5 fill-accent text-accent" />
                  )}
                </td>
                <td className="py-2.5 pr-4 text-ink-2">{a.artist}</td>
                <td className="py-2.5 pr-4 text-ink-2 tabular-nums">{a.year}</td>
                <td className="py-2.5 pr-4 text-ink-2">
                  {[venue?.name, place?.name].filter(Boolean).join(', ')}
                </td>
                <td className="py-2.5 text-right text-ink-3 tabular-nums">
                  {format.date(a.createdAt, 'medium')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
