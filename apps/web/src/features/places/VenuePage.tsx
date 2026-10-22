import { removeVenue } from '@mnemo/core';
import { Button, EmptyState, Rating, SectionTitle } from '@mnemo/ui';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ImagePlusIcon,
  PencilIcon,
  StampIcon,
  Trash2Icon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-map-gl/maplibre';
import { useArtworks, useLookups, useVisits } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { Confirm, Flag, KindIcon } from '../../components/bits';
import { MapView } from '../../components/MapView';
import { MediaImage } from '../../components/MediaImage';
import { WikiSummary } from '../../components/WikiSummary';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/venue/$venueId');

export function VenuePage() {
  const { t } = useTranslation();
  const { venueId } = routeApi.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const format = useFormat();
  const { venues, placeOfVenue } = useLookups();
  const visits = useVisits();
  const artworks = useArtworks();

  const venue = venues.get(venueId);
  const place = placeOfVenue(venueId);
  if (!visits) return null;
  if (!venue) return <EmptyState title={t('venue.notFound')} />;

  const venueVisits = visits.filter((v) => v.venueId === venueId);
  const venueArtworks = (artworks ?? []).filter((a) => a.venueId === venueId);

  return (
    <article>
      {place && (
        <Link
          to="/place/$placeId"
          params={{ placeId: place.id }}
          className="eyebrow mb-8 inline-flex items-center gap-2 text-ink-3 hover:text-ink"
        >
          <ArrowLeftIcon className="size-3.5" /> {place.name}
        </Link>
      )}
      <header className="grid animate-rise gap-10 border-b border-line pb-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <p className="eyebrow mb-4 flex items-center gap-2 text-accent">
            <KindIcon kind={venue.kind} className="size-3.5" /> {t(`venue.kinds.${venue.kind}`)}
            {place && (
              <>
                {' · '}
                <Flag code={place.countryCode} /> {place.name}
              </>
            )}
          </p>
          <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)] font-[360]">{venue.name}</h1>
          {venue.address && <p className="mt-4 text-sm text-ink-3">{venue.address}</p>}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:decoration-accent"
            >
              {new URL(venue.website, 'https://x').hostname.replace(/^www\./, '')}{' '}
              <ArrowUpRightIcon className="size-3" />
            </a>
          )}
          {venue.notes && <p className="caption mt-6 max-w-xl text-lg text-ink-2">{venue.notes}</p>}
          <div className="mt-8 flex flex-wrap gap-2">
            <Button onClick={() => dialogs.open({ type: 'visit', venueId })}>
              <StampIcon /> {t('venue.addVisit')}
            </Button>
            <Button variant="outline" onClick={() => dialogs.open({ type: 'artwork', venueId })}>
              <ImagePlusIcon /> {t('venue.addArtwork')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => dialogs.open({ type: 'venue', venueId })}
            >
              <PencilIcon />
            </Button>
            <Confirm
              title={t('venue.deleteTitle', { name: venue.name })}
              description={t('venue.deleteText')}
              confirmLabel={t('common.delete')}
              onConfirm={async () => {
                await removeVenue(store, venue.id);
                void navigate(
                  place
                    ? { to: '/place/$placeId', params: { placeId: place.id } }
                    : { to: '/atlas' },
                );
              }}
              trigger={(open) => (
                <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={open}>
                  <Trash2Icon />
                </Button>
              )}
            />
          </div>
        </div>
        <div className="space-y-6">
          {venue.coords && (
            <MapView
              className="aspect-[16/10] rounded-frame shadow-frame"
              center={venue.coords}
              zoom={14}
            >
              <Marker longitude={venue.coords.lng} latitude={venue.coords.lat}>
                <span className="block size-4 rounded-full border-2 border-surface bg-accent shadow-frame" />
              </Marker>
            </MapView>
          )}
          <WikiSummary
            tag={venue.wikipedia}
            title={venue.wikipedia ? undefined : venue.name}
            layout="inline"
          />
        </div>
      </header>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section>
          <SectionTitle>{t('venue.visits')}</SectionTitle>
          {venueVisits.length === 0 ? (
            <p className="caption text-lg text-ink-3">{t('venue.noVisits')}</p>
          ) : (
            <ol className="space-y-8">
              {venueVisits.map((visit) => (
                <li key={visit.id} className="group relative border-l border-line pl-6">
                  <span className="absolute top-1.5 -left-[5px] size-2.5 rounded-full bg-accent" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="display text-2xl font-[400]">{format.date(visit.date)}</p>
                      {visit.rating && (
                        <Rating value={visit.rating} label={t('visit.rating')} className="mt-1" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common.edit')}
                      onClick={() => dialogs.open({ type: 'visit', visitId: visit.id })}
                    >
                      <PencilIcon />
                    </Button>
                  </div>
                  {visit.companions.length > 0 && (
                    <p className="mt-2 text-xs text-ink-3">
                      {t('visit.with', { names: visit.companions.join(', ') })}
                    </p>
                  )}
                  {visit.notes && (
                    <p className="mt-3 font-display text-base leading-relaxed whitespace-pre-line text-ink-2">
                      {visit.notes}
                    </p>
                  )}
                  {visit.mediaIds.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {visit.mediaIds.map((id) => (
                        <MediaImage key={id} mediaId={id} alt="" className="aspect-square" />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <SectionTitle>{t('venue.artworks')}</SectionTitle>
          {venueArtworks.length === 0 ? (
            <p className="caption text-lg text-ink-3">{t('venue.noArtworks')}</p>
          ) : (
            <div className="masonry columns-2 gap-6 md:columns-3">
              {venueArtworks.map((a) => (
                <ArtworkCard key={a.id} artwork={a} showVenue={false} className="mb-8" />
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
