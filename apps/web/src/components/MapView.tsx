import type { Coords } from '@mnemo/core';
import { cn, Spinner } from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import { type StyleSpecification, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import MapGL, {
  AttributionControl,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
} from 'react-map-gl/maplibre';
import { useResolvedTheme } from '../app/shell/Appearance';

// The ESM build looks for its worker next to the bundled chunk; point it at Vite's worker bundle.
setWorkerUrl(maplibreWorkerUrl);

const STYLE_URLS = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** Warm, paper-like recolouring of the OpenFreeMap base styles. */
const PALETTE = {
  light: {
    background: '#efe9df',
    water: '#c8d1cf',
    park: '#e2e2d2',
    landcover_wood: '#dcdecc',
    landuse_park: '#e2e2d2',
    landuse_residential: '#ebe5d9',
    building: '#e5ddcf',
  },
  dark: {
    background: '#151412',
    water: '#0f1517',
    park: '#1b1c17',
    landcover_wood: '#1a1b16',
    landuse_park: '#1b1c17',
    landuse_residential: '#181715',
    building: '#1d1b18',
  },
} as const;

/** Label expression preferring names in the UI language, e.g. "Florenz" instead of "Florence". */
const localizedName = (locale: string) => [
  'coalesce',
  ['get', `name:${locale}`],
  ['get', 'name:latin'],
  ['get', 'name'],
];

async function loadStyle(theme: 'light' | 'dark', locale: string): Promise<StyleSpecification> {
  const response = await fetch(STYLE_URLS[theme]);
  if (!response.ok) throw new Error(`Map style HTTP ${response.status}`);
  const style = (await response.json()) as StyleSpecification;
  const colors: Record<string, string> = PALETTE[theme];
  for (const layer of style.layers) {
    if (
      layer.type === 'symbol' &&
      JSON.stringify(layer.layout?.['text-field'] ?? '').includes('name:latin')
    ) {
      layer.layout = { ...layer.layout, 'text-field': localizedName(locale) as never };
    }
    const color = colors[layer.id];
    if (!color) continue;
    if (layer.type === 'background') layer.paint = { ...layer.paint, 'background-color': color };
    if (layer.type === 'fill') layer.paint = { ...layer.paint, 'fill-color': color };
  }
  return style;
}

export interface MapViewProps {
  children?: ReactNode;
  className?: string;
  bounds?: [[number, number], [number, number]] | null;
  center?: Coords;
  zoom?: number;
  interactiveLayerIds?: string[];
  onClick?: (event: MapLayerMouseEvent) => void;
  onLoad?: () => void;
  /** Extra space when fitting bounds, e.g. for a panel overlapping the map. */
  padding?: { top: number; right: number; bottom: number; left: number } | number;
}

export const MapView = forwardRef<MapRef, MapViewProps>(function MapView(
  {
    children,
    className,
    bounds,
    center,
    zoom = 11,
    interactiveLayerIds,
    onClick,
    onLoad,
    padding = 72,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const theme = useResolvedTheme();
  const locale = i18n.resolvedLanguage ?? 'de';
  const style = useQuery({
    queryKey: ['map-style', theme, locale],
    queryFn: () => loadStyle(theme, locale),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const initialViewState = bounds
    ? { bounds, fitBoundsOptions: { padding, maxZoom: 13 } }
    : center
      ? { longitude: center.lng, latitude: center.lat, zoom }
      : { longitude: 12, latitude: 47, zoom: 3.2 };

  return (
    <div className={cn('relative overflow-hidden bg-paper-2', className)}>
      {style.data ? (
        <MapGL
          ref={ref}
          mapStyle={style.data}
          initialViewState={initialViewState}
          interactiveLayerIds={interactiveLayerIds}
          onClick={onClick}
          onLoad={onLoad}
          attributionControl={false}
          dragRotate={false}
          style={{ position: 'absolute', inset: 0 }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          <AttributionControl position="bottom-left" compact />
          {children}
        </MapGL>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          {style.isError ? (
            <span className="text-sm text-ink-3">{t('map.unavailable')}</span>
          ) : (
            <Spinner />
          )}
        </div>
      )}
    </div>
  );
});
