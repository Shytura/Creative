import {
  type Artwork,
  accentFromPalette,
  collectionHas,
  type ItemRef,
  onColor,
  removeArtwork,
  toggleInCollection,
} from '@mnemo/core';
import {
  Button,
  Chip,
  cn,
  EmptyState,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  SectionTitle,
  Skeleton,
  Tag,
  Tooltip,
} from '@mnemo/ui';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  EllipsisIcon,
  HeartIcon,
  ListPlusIcon,
  Maximize2Icon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useArtwork,
  useArtworks,
  useCollections,
  useCreators,
  useLookups,
  useMedia,
  useMediaUrl,
  useVisits,
} from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useResolvedTheme } from '../../app/shell/Appearance';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { Confirm, Fact, Flag } from '../../components/bits';
import { ImageViewer } from '../../components/ImageViewer';
import { MediaImage } from '../../components/MediaImage';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/artwork/$artworkId');
const PAPER = { light: '#f3eee5', dark: '#12110f' };

export function ArtworkDetailPage() {
  const { t } = useTranslation();
  const { artworkId } = routeApi.useParams();
  const query = useArtwork(artworkId);
  const artwork = query.data;
  const store = useStore();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const theme = useResolvedTheme();
  const format = useFormat();
  const { venues, placeOfVenue } = useLookups();
  const visits = useVisits();
  const collections = useCollections();
  const creators = useCreators();
  const allArtworks = useArtworks();
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const mediaId = artwork?.mediaIds[index] ?? artwork?.mediaIds[0];
  const media = useMedia(mediaId);
  const fullUrl = useMediaUrl(mediaId, 'full');

  // The page borrows its accent colour from the artwork itself.
  const accentStyle = useMemo(() => {
    const accent = accentFromPalette(artwork?.palette ?? [], PAPER[theme]);
    return accent
      ? ({ '--mn-accent': accent, '--mn-accent-ink': onColor(accent) } as CSSProperties)
      : undefined;
  }, [artwork?.palette, theme]);

  const related = useMemo(() => {
    if (!artwork || !allArtworks) return { byArtist: [], atVenue: [] };
    const others = allArtworks.filter((a) => a.id !== artwork.id);
    const sameCreator = (a: Artwork) => a.creatorIds.some((id) => artwork.creatorIds.includes(id));
    return {
      byArtist: others.filter(sameCreator).slice(0, 4),
      atVenue: artwork.venueId
        ? others.filter((a) => a.venueId === artwork.venueId && !sameCreator(a)).slice(0, 4)
        : [],
    };
  }, [artwork, allArtworks]);

  if (query.isPending) {
    return (
      <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
        <Skeleton className="aspect-[4/5]" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <EmptyState
        title={t('artwork.notFound')}
        action={
          <Button asChild variant="outline">
            <Link to="/collection">{t('artwork.backToCollection')}</Link>
          </Button>
        }
      />
    );
  }

  const venue = artwork.venueId ? venues.get(artwork.venueId) : undefined;
  const creator = creators?.find((c) => c.id === artwork.creatorIds[0]);
  const place = placeOfVenue(artwork.venueId);
  const visit = visits?.find((v) => v.id === artwork.visitId);
  const ref: ItemRef = { kind: 'artwork', id: artwork.id };
  const memberOf = (collections ?? []).filter((c) => collectionHas(c, ref));

  const toggleFavorite = () =>
    void store.artworks.update(artwork.id, { favorite: !artwork.favorite });

  return (
    <article style={accentStyle}>
      <Link
        to="/collection"
        className="eyebrow mb-8 inline-flex items-center gap-2 text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" /> {t('nav.collection')}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <section aria-label={t('artwork.images')}>
          <div className="relative flex min-h-[40vh] items-center justify-center bg-paper-2/50 p-6 md:p-12">
            {mediaId ? (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="group relative cursor-zoom-in"
                aria-label={t('artwork.zoom')}
              >
                <MediaImage
                  mediaId={mediaId}
                  variant="full"
                  alt={artwork.title}
                  eager
                  className="bg-transparent shadow-float"
                  imgClassName="max-h-[76vh] w-auto object-contain"
                  style={{ viewTransitionName: `artwork-${artwork.id}` }}
                />
                <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                  <Maximize2Icon className="size-4" />
                </span>
              </button>
            ) : (
              <div className="caption py-24 text-center text-2xl text-ink-3">
                {t('artwork.noImage')}
              </div>
            )}
          </div>
          {artwork.mediaIds.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {artwork.mediaIds.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1}`}
                  className={cn(
                    'shrink-0 cursor-pointer outline-offset-2 transition-opacity',
                    i === index
                      ? 'outline outline-2 outline-accent'
                      : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <MediaImage mediaId={id} alt="" className="size-20" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-4 text-accent">
            {artwork.status === 'wishlist'
              ? t('artwork.status.wishlistLong')
              : visit
                ? t('artwork.seenOn', { date: format.date(visit.date) })
                : t('artwork.status.seen')}
          </p>
          <h1 className="display text-[clamp(2.5rem,5vw,4.25rem)] font-[380] animate-rise">
            {artwork.title}
          </h1>
          {(artwork.artist || artwork.year) && (
            <p className="caption mt-4 text-2xl text-ink-2">
              {creator ? (
                <Link
                  to="/creator/$creatorId"
                  params={{ creatorId: creator.id }}
                  className="underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors hover:text-ink hover:decoration-accent"
                >
                  {artwork.artist ?? creator.name}
                </Link>
              ) : (
                artwork.artist
              )}
              {artwork.artist && artwork.year ? ', ' : ''}
              {artwork.year}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Tooltip content={artwork.favorite ? t('artwork.unfavorite') : t('artwork.favorite')}>
              <Button
                variant={artwork.favorite ? 'accent' : 'outline'}
                size="icon"
                className="rounded-full"
                aria-pressed={artwork.favorite}
                aria-label={t('artwork.favorite')}
                onClick={toggleFavorite}
              >
                <HeartIcon className={cn(artwork.favorite && 'fill-current')} />
              </Button>
            </Tooltip>
            {mediaId && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setViewerOpen(true)}
              >
                <Maximize2Icon /> {t('artwork.zoom')}
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => dialogs.open({ type: 'artwork', artworkId: artwork.id })}
            >
              <PencilIcon /> {t('common.edit')}
            </Button>
            <Menu modal={false}>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('common.more')}
                >
                  <EllipsisIcon />
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>{t('artwork.fields.collections')}</MenuLabel>
                {collections?.map((c) => (
                  <MenuItem
                    key={c.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      void toggleInCollection(store, c.id, ref);
                    }}
                  >
                    <CheckIcon className={cn(!collectionHas(c, ref) && 'opacity-0')} /> {c.name}
                  </MenuItem>
                ))}
                <MenuItem onSelect={() => dialogs.open({ type: 'collection', addItem: ref })}>
                  <ListPlusIcon /> {t('collection.new')}
                </MenuItem>
                <MenuSeparator />
                <MenuItem className="text-danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2Icon /> {t('common.delete')}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>

          <dl className="mt-10 border-t border-line">
            <Fact label={t('artwork.fields.medium')}>{artwork.medium}</Fact>
            <Fact label={t('artwork.fields.venue')}>
              {venue && (
                <span>
                  <Link
                    to="/venue/$venueId"
                    params={{ venueId: venue.id }}
                    className="underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                  >
                    {venue.name}
                  </Link>
                  {place && (
                    <>
                      {', '}
                      <Link
                        to="/place/$placeId"
                        params={{ placeId: place.id }}
                        className="hover:text-accent"
                      >
                        <Flag code={place.countryCode} /> {place.name}
                      </Link>
                    </>
                  )}
                </span>
              )}
            </Fact>
            <Fact label={t('artwork.fields.date')}>{visit && format.date(visit.date)}</Fact>
            <Fact label={t('artwork.fields.source')}>
              {artwork.source && (
                <span className="space-y-0.5">
                  <a
                    href={artwork.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                  >
                    {artwork.source.museumName ?? artwork.source.provider}{' '}
                    <ArrowUpRightIcon className="size-3" />
                  </a>
                  <span className="block text-xs text-ink-3">
                    {[artwork.source.license, artwork.source.credit].filter(Boolean).join(' · ')}
                  </span>
                </span>
              )}
            </Fact>
          </dl>

          {artwork.palette.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3 text-ink-3">{t('artwork.palette')}</p>
              <div className="flex h-12 overflow-hidden rounded-frame shadow-soft">
                {artwork.palette.map((c) => (
                  <Link
                    key={c}
                    to="/collection"
                    search={{ color: c }}
                    title={t('artwork.similarColor')}
                    className="group relative flex-1 transition-[flex-grow] duration-500 ease-gallery hover:flex-[2]"
                    style={{ background: c }}
                  >
                    <span
                      className="absolute bottom-1 left-1.5 font-mono text-[0.5625rem] opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: onColor(c) }}
                    >
                      {c}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {artwork.notes && (
            <blockquote className="mt-10 border-l-2 border-gold pl-5 font-display text-lg leading-relaxed whitespace-pre-line text-ink-2 italic">
              {artwork.notes}
            </blockquote>
          )}

          {(artwork.tags.length > 0 || memberOf.length > 0) && (
            <div className="mt-8 flex flex-wrap gap-2">
              {memberOf.map((c) => (
                <Link key={c.id} to="/collection" search={{ collection: c.id }}>
                  <Chip>{c.name}</Chip>
                </Link>
              ))}
              {artwork.tags.map((tag) => (
                <Link key={tag} to="/collection" search={{ tag }}>
                  <Tag className="hover:border-ink-3">#{tag}</Tag>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {related.byArtist.length > 0 && (
        <section className="mt-24">
          <SectionTitle>
            {t('artwork.moreBy', { artist: creator?.name ?? artwork.artist })}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.byArtist.map((a) => (
              <ArtworkCard key={a.id} artwork={a} crop />
            ))}
          </div>
        </section>
      )}
      {related.atVenue.length > 0 && venue && (
        <section className="mt-20">
          <SectionTitle>{t('artwork.alsoAt', { venue: venue.name })}</SectionTitle>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.atVenue.map((a) => (
              <ArtworkCard key={a.id} artwork={a} crop showVenue={false} />
            ))}
          </div>
        </section>
      )}

      <Confirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('artwork.deleteTitle')}
        description={t('artwork.deleteText', { title: artwork.title })}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          await removeArtwork(store, artwork.id);
          toast.success(t('artwork.deleted'));
          void navigate({ to: '/collection' });
        }}
      />
      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        src={fullUrl}
        iiifInfoUrl={index === 0 ? artwork.source?.iiifInfoUrl : undefined}
        title={artwork.title}
        caption={[
          artwork.artist,
          artwork.year,
          media?.width && media.height ? `${media.width} × ${media.height}px` : undefined,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
    </article>
  );
}
