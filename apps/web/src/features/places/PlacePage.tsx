import { bounds, removePlace } from '@mnemo/core';
import { Button, EmptyState, SectionTitle } from '@mnemo/ui';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, CompassIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-map-gl/maplibre';
import { useArtworks, usePlaces, useVenues, useVisits } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { Confirm, Flag, KindIcon } from '../../components/bits';
import { MapView } from '../../components/MapView';
import { WikiSummary } from '../../components/WikiSummary';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/place/$placeId');

export function PlacePage() {
  const { t } = useTranslation();
  const { placeId } = routeApi.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const format = useFormat();
  const places = usePlaces();
  const allVenues = useVenues();
  const visits = useVisits();
  const artworks = useArtworks();

  const place = places?.find((p) => p.id === placeId);
  const venues = useMemo(
    () => (allVenues ?? []).filter((v) => v.placeId === placeId),
    [allVenues, placeId],
  );
  const venueIds = new Set(venues.map((v) => v.id));
  const placeVisits = (visits ?? []).filter((v) => venueIds.has(v.venueId));
  const placeArtworks = (artworks ?? []).filter((a) => a.venueId && venueIds.has(a.venueId));

  if (!places) return null;
  if (!place) return <EmptyState title={t('place.notFound')} />;

  const planTrip = async () => {
    const trip = await store.trips.create({
      title: t('planner.tripTo', { place: place.name }),
      placeIds: [place.id],
    });
    void navigate({ to: '/trip/$tripId', params: { tripId: trip.id } });
  };

  const points = [place.coords, ...venues.map((v) => v.coords)].filter((c) => c !== undefined);

  return (
    <article>
      <Link
        to="/atlas"
        className="eyebrow mb-8 inline-flex items-center gap-2 text-ink-3 hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" /> {t('nav.atlas')}
      </Link>
      <header className="flex animate-rise flex-col gap-6 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-4 flex items-center gap-2 text-accent">
            <Flag code={place.countryCode} className="text-base" />{' '}
            {format.country(place.countryCode, place.country)}
          </p>
          <h1 className="display text-[clamp(3rem,9vw,7.5rem)] font-[340]">{place.name}</h1>
          <p className="caption mt-5 text-xl text-ink-2">
            {t('place.summary', {
              venues: venues.length,
              visits: placeVisits.length,
              artworks: placeArtworks.length,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => dialogs.open({ type: 'venue', placeId: place.id })}>
            <PlusIcon /> {t('place.addVenue')}
          </Button>
          <Button variant="outline" onClick={() => void planTrip()}>
            <CompassIcon /> {t('place.planTrip')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.edit')}
            onClick={() => dialogs.open({ type: 'place', placeId: place.id })}
          >
            <PencilIcon />
          </Button>
          <Confirm
            title={t('place.deleteTitle', { name: place.name })}
            description={t('place.deleteText')}
            confirmLabel={t('common.delete')}
            onConfirm={async () => {
              await removePlace(store, place.id);
              void navigate({ to: '/atlas' });
            }}
            trigger={(open) => (
              <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={open}>
                <Trash2Icon />
              </Button>
            )}
          />
        </div>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section>
          <SectionTitle>{t('place.venues')}</SectionTitle>
          {venues.length === 0 ? (
            <p className="caption text-lg text-ink-3">{t('place.noVenues')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {venues.map((venue) => {
                const vv = placeVisits.filter((v) => v.venueId === venue.id);
                const count = placeArtworks.filter((a) => a.venueId === venue.id).length;
                return (
                  <li key={venue.id}>
                    <Link
                      to="/venue/$venueId"
                      params={{ venueId: venue.id }}
                      className="group flex items-center gap-5 py-5 transition-colors"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink-3 transition-colors group-hover:border-accent group-hover:text-accent">
                        <KindIcon kind={venue.kind} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="display block truncate text-2xl font-[400] transition-colors group-hover:text-accent">
                          {venue.name}
                        </span>
                        <span className="text-xs text-ink-3">
                          {t(`venue.kinds.${venue.kind}`)}
                          {vv[0] &&
                            ` · ${t('place.lastVisit', { date: format.date(vv[0].date, 'monthYear') })}`}
                        </span>
                      </span>
                      <span className="text-right text-xs text-ink-3 tabular-nums">
                        {t('place.visitCount', { count: vv.length })}
                        <br />
                        {t('place.artworkCount', { count })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="space-y-8">
          {points.length > 0 && (
            <MapView
              className="aspect-[4/3] rounded-frame shadow-frame"
              bounds={points.length > 1 ? bounds(points) : null}
              center={points[0]}
              zoom={12}
            >
              {venues.map(
                (v) =>
                  v.coords && (
                    <Marker key={v.id} longitude={v.coords.lng} latitude={v.coords.lat}>
                      <span className="block size-3.5 rounded-full border-2 border-surface bg-accent shadow-soft" />
                    </Marker>
                  ),
              )}
            </MapView>
          )}
          <WikiSummary tag={place.wikipedia} title={place.wikipedia ? undefined : place.name} />
        </aside>
      </div>

      {placeArtworks.length > 0 && (
        <section className="mt-20">
          <SectionTitle>{t('place.artworks')}</SectionTitle>
          <div className="masonry columns-2 gap-6 md:columns-4">
            {placeArtworks.map((a) => (
              <ArtworkCard key={a.id} artwork={a} className="mb-8" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
