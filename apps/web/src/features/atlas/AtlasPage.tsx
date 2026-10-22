import { bounds, type Coords, type VenueKind } from '@mnemo/core';
import { Chip, cn, Segmented } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import type { FeatureCollection, Point } from 'geojson';
import { ArrowRightIcon, ArrowUpRightIcon, ChevronDownIcon } from 'lucide-react';
import type { GeoJSONSource } from 'maplibre-gl';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, type MapLayerMouseEvent, type MapRef, Popup, Source } from 'react-map-gl/maplibre';
import { useInsights, useLookups, useTrips, useVisits } from '../../app/data';
import { Flag, KindIcon } from '../../components/bits';
import { MapView } from '../../components/MapView';
import { useFormat } from '../../lib/format';
import { useMediaQuery } from '../../lib/hooks';
import { useCssVar } from '../../lib/useCssVar';

interface VisitedProps {
  id: string;
  name: string;
  kind: VenueKind;
  place: string;
  visits: number;
  last: string;
}

interface PlannedProps {
  tripId: string;
  trip: string;
  name: string;
  kind: VenueKind;
}

type Selection =
  | { type: 'visited'; coords: Coords; props: VisitedProps }
  | { type: 'planned'; coords: Coords; props: PlannedProps };

export function AtlasPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const visits = useVisits();
  const trips = useTrips();
  const insights = useInsights();
  const { venues, places } = useLookups();
  const accent = useCssVar('--mn-accent', '#a4462f');
  const paper = useCssVar('--mn-surface', '#faf7f1');
  const mapRef = useRef<MapRef>(null);
  const wide = useMediaQuery('(min-width: 1024px)');

  const [year, setYear] = useState<number | 'all'>('all');
  const [showVisited, setShowVisited] = useState(true);
  const [showPlanned, setShowPlanned] = useState(true);
  const [tab, setTab] = useState<'countries' | 'places'>('countries');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const years = useMemo(
    () => [...new Set((visits ?? []).map((v) => Number(v.date.slice(0, 4))))].sort((a, b) => b - a),
    [visits],
  );

  const visited = useMemo<FeatureCollection<Point, VisitedProps>>(() => {
    const filtered = (visits ?? []).filter(
      (v) => year === 'all' || v.date.startsWith(String(year)),
    );
    const byVenue = new Map<string, { count: number; last: string }>();
    for (const v of filtered) {
      const entry = byVenue.get(v.venueId);
      byVenue.set(v.venueId, {
        count: (entry?.count ?? 0) + 1,
        last: entry && entry.last > v.date ? entry.last : v.date,
      });
    }
    // Venues with seen artworks but no recorded visit still count as visited (all years only).
    if (year === 'all')
      for (const id of insights?.visitedVenueIds ?? [])
        if (!byVenue.has(id)) byVenue.set(id, { count: 0, last: '' });
    return {
      type: 'FeatureCollection',
      features: [...byVenue].flatMap(([id, info]) => {
        const venue = venues.get(id);
        if (!venue?.coords) return [];
        return [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [venue.coords.lng, venue.coords.lat] },
            properties: {
              id,
              name: venue.name,
              kind: venue.kind,
              place: places.get(venue.placeId)?.name ?? '',
              visits: info.count,
              last: info.last,
            },
          },
        ];
      }),
    };
  }, [visits, venues, places, year, insights]);

  const planned = useMemo<FeatureCollection<Point, PlannedProps>>(
    () => ({
      type: 'FeatureCollection',
      features: (trips ?? [])
        .filter((trip) => trip.status !== 'done')
        .flatMap((trip) =>
          trip.items
            .filter((i) => i.coords && !i.done)
            .map((i) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [i.coords!.lng, i.coords!.lat] },
              properties: { tripId: trip.id, trip: trip.title, name: i.name, kind: i.kind },
            })),
        ),
    }),
    [trips],
  );

  // Only for the first render; later changes should not move the camera.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally computed once data is loaded
  const initialBounds = useMemo(() => {
    const pts = [...visited.features, ...planned.features].map((f) => ({
      lng: f.geometry.coordinates[0]!,
      lat: f.geometry.coordinates[1]!,
    }));
    return pts.length > 1 ? bounds(pts) : null;
  }, [visits === undefined, trips === undefined]);

  const fitTo = (coords: Array<Coords | undefined>) => {
    const pts = coords.filter((c): c is Coords => Boolean(c));
    if (pts.length === 1)
      mapRef.current?.flyTo({ center: [pts[0]!.lng, pts[0]!.lat], zoom: 11, duration: 1400 });
    else if (pts.length > 1)
      mapRef.current?.fitBounds(bounds(pts)!, {
        padding: wide ? { top: 90, right: 90, bottom: 90, left: 470 } : 60,
        maxZoom: 12,
        duration: 1400,
      });
  };

  const onClick = async (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setSelection(null);
      return;
    }
    const [lng, lat] = (feature.geometry as Point).coordinates as [number, number];
    if (feature.layer.id === 'visited-clusters') {
      const source = mapRef.current?.getSource('visited') as GeoJSONSource | undefined;
      const zoom = await source?.getClusterExpansionZoom(feature.properties.cluster_id as number);
      mapRef.current?.easeTo({ center: [lng, lat], zoom: zoom ?? 8, duration: 800 });
      return;
    }
    const type = feature.layer.id === 'planned-points' ? 'planned' : 'visited';
    setSelection({ type, coords: { lat, lng }, props: feature.properties as never });
  };

  if (!visits || !trips) return <div className="flex-1 bg-paper-2" />;

  return (
    <div className="relative flex flex-1 flex-col lg:block">
      <MapView
        ref={mapRef}
        className="h-[62dvh] lg:absolute lg:inset-0 lg:h-auto"
        bounds={initialBounds}
        padding={wide ? { top: 80, right: 80, bottom: 80, left: 460 } : 48}
        interactiveLayerIds={['visited-clusters', 'visited-points', 'planned-points']}
        onClick={(e) => void onClick(e)}
      >
        {showPlanned && (
          <Source id="planned" type="geojson" data={planned}>
            <Layer
              id="planned-points"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': paper,
                'circle-stroke-color': accent,
                'circle-stroke-width': 2,
                'circle-opacity': 0.9,
              }}
            />
          </Source>
        )}
        {showVisited && (
          <Source
            id="visited"
            type="geojson"
            data={visited}
            cluster
            clusterRadius={44}
            clusterMaxZoom={11}
          >
            <Layer
              id="visited-clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': accent,
                'circle-opacity': 0.9,
                'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 15, 20, 26],
                'circle-stroke-color': paper,
                'circle-stroke-width': 2,
              }}
            />
            <Layer
              id="visited-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['Noto Sans Bold'],
                'text-size': 12,
              }}
              paint={{ 'text-color': paper }}
            />
            <Layer
              id="visited-points"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': accent,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 12, 8],
                'circle-stroke-color': paper,
                'circle-stroke-width': 2,
              }}
            />
          </Source>
        )}
        {selection && (
          <Popup
            longitude={selection.coords.lng}
            latitude={selection.coords.lat}
            offset={14}
            maxWidth="300px"
            onClose={() => setSelection(null)}
            closeOnClick={false}
          >
            <div className="min-w-56 p-4 pr-8">
              <p className="eyebrow flex items-center gap-1.5 text-[0.625rem] text-accent">
                <KindIcon kind={selection.props.kind} className="size-3" />
                {selection.type === 'visited'
                  ? selection.props.place
                  : t('atlas.plannedIn', { trip: selection.props.trip })}
              </p>
              <p className="display mt-2 text-xl font-[440]">{selection.props.name}</p>
              {selection.type === 'visited' ? (
                <>
                  <p className="mt-1 text-xs text-ink-3">
                    {selection.props.visits > 0
                      ? `${t('place.visitCount', { count: selection.props.visits })} · ${format.date(selection.props.last, 'monthYear')}`
                      : t('atlas.seenArtworks')}
                  </p>
                  <Link
                    to="/venue/$venueId"
                    params={{ venueId: selection.props.id }}
                    className="eyebrow mt-3 inline-flex items-center gap-1 text-ink-2 hover:text-accent"
                  >
                    {t('common.open')} <ArrowRightIcon className="size-3" />
                  </Link>
                </>
              ) : (
                <Link
                  to="/trip/$tripId"
                  params={{ tripId: selection.props.tripId }}
                  className="eyebrow mt-3 inline-flex items-center gap-1 text-ink-2 hover:text-accent"
                >
                  {t('atlas.toTrip')} <ArrowRightIcon className="size-3" />
                </Link>
              )}
            </div>
          </Popup>
        )}
      </MapView>

      <aside
        className={cn(
          'z-10 flex flex-col border-line bg-surface/92 backdrop-blur-xl lg:absolute lg:top-6 lg:left-6 lg:max-h-[calc(100%-3rem)] lg:w-[24rem] lg:rounded-frame lg:border lg:shadow-float',
        )}
      >
        <header className="border-b border-line p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-accent">{t('atlas.eyebrow')}</p>
              <h1 className="display mt-2 text-5xl font-[360]">{t('atlas.title')}</h1>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="hidden cursor-pointer rounded-full p-2 text-ink-3 hover:bg-ink/6 lg:block"
              aria-expanded={panelOpen}
              aria-label={t('atlas.togglePanel')}
            >
              <ChevronDownIcon
                className={cn('size-5 transition-transform', !panelOpen && '-rotate-90')}
              />
            </button>
          </div>
          {insights && (
            <p className="caption mt-3 text-lg text-ink-2">
              {t('atlas.summary', {
                countries: insights.totals.countries,
                places: insights.totals.places,
                venues: insights.totals.venues,
              })}
            </p>
          )}
        </header>

        {panelOpen && (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <div className="flex flex-wrap gap-2">
              <Chip
                active={showVisited}
                onClick={() => setShowVisited((v) => !v)}
                leading={<span className="size-2.5 rounded-full bg-accent" />}
              >
                {t('atlas.visited')}
              </Chip>
              <Chip
                active={showPlanned}
                onClick={() => setShowPlanned((v) => !v)}
                leading={<span className="size-2.5 rounded-full border-2 border-accent" />}
              >
                {t('atlas.planned')}
              </Chip>
            </div>

            {years.length > 0 && (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                <Chip active={year === 'all'} onClick={() => setYear('all')}>
                  {t('atlas.allYears')}
                </Chip>
                {years.map((y) => (
                  <Chip
                    key={y}
                    active={year === y}
                    onClick={() => setYear(y)}
                    className="tabular-nums"
                  >
                    {y}
                  </Chip>
                ))}
              </div>
            )}

            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'countries', label: t('atlas.countries') },
                { value: 'places', label: t('atlas.places') },
              ]}
            />

            {tab === 'countries' ? (
              <ul className="space-y-1">
                {insights?.countries.map((c) => (
                  <li key={c.code ?? c.name}>
                    <button
                      type="button"
                      onClick={() => fitTo(c.places.map((p) => p.coords))}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-frame px-2 py-2.5 text-left transition-colors hover:bg-ink/5"
                    >
                      <Flag code={c.code} className="text-3xl" />
                      <span className="flex-1">
                        <span className="block font-medium">{format.country(c.code, c.name)}</span>
                        <span className="block text-xs text-ink-3">
                          {c.places.map((p) => p.name).join(', ')}
                        </span>
                      </span>
                      <span className="display text-2xl text-ink-3 tabular-nums">
                        {c.places.length}
                      </span>
                    </button>
                  </li>
                ))}
                {insights?.countries.length === 0 && (
                  <p className="caption text-ink-3">{t('atlas.empty')}</p>
                )}
              </ul>
            ) : (
              <ul className="divide-y divide-line">
                {[...places.values()].map((p) => {
                  const placeVenues = [...venues.values()].filter((v) => v.placeId === p.id);
                  const isVisited = insights?.visitedPlaceIds.has(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => fitTo([p.coords, ...placeVenues.map((v) => v.coords)])}
                        className="flex flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <span
                          className={cn(
                            'size-2.5 shrink-0 rounded-full border-2 border-accent',
                            isVisited && 'bg-accent',
                          )}
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium">
                            {p.name} <Flag code={p.countryCode} />
                          </span>
                          <span className="block text-xs text-ink-3">
                            {t('place.venueCount', { count: placeVenues.length })}
                          </span>
                        </span>
                      </button>
                      <Link
                        to="/place/$placeId"
                        params={{ placeId: p.id }}
                        className="rounded-full p-1.5 text-ink-3 hover:bg-ink/6 hover:text-accent"
                        aria-label={t('common.open')}
                      >
                        <ArrowUpRightIcon className="size-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
