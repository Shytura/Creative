import { type EpochId, epochs } from '@mnemo/core';
import { Button, EmptyState } from '@mnemo/ui';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SalonPage } from '../features/home/SalonPage';
import { AppShell } from './shell/AppShell';
import { ErrorPage } from './shell/ErrorPage';

export interface CollectionSearch {
  q?: string;
  status?: 'seen' | 'wishlist';
  fav?: boolean;
  artist?: string;
  place?: string;
  venue?: string;
  tag?: string;
  epoch?: EpochId;
  color?: string;
  collection?: string;
  view?: 'gallery' | 'wall' | 'list';
}

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);
const oneOf = <T extends string>(v: unknown, values: readonly T[]) =>
  values.includes(v as T) ? (v as T) : undefined;

function validateCollectionSearch(search: Record<string, unknown>): CollectionSearch {
  const result: CollectionSearch = {
    q: str(search.q),
    status: oneOf(search.status, ['seen', 'wishlist'] as const),
    fav: search.fav === true || search.fav === 'true' ? true : undefined,
    artist: str(search.artist),
    place: str(search.place),
    venue: str(search.venue),
    tag: str(search.tag),
    epoch: oneOf(
      search.epoch,
      epochs.map((e) => e.id),
    ),
    color:
      typeof search.color === 'string' && /^#[0-9a-f]{6}$/i.test(search.color)
        ? search.color
        : undefined,
    collection: str(search.collection),
    view: oneOf(search.view, ['gallery', 'wall', 'list'] as const),
  };
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

const route = <P extends string>(
  path: P,
  component: Parameters<typeof createRoute>[0]['component'],
) => createRoute({ getParentRoute: () => rootRoute, path, component });

const salonRoute = route('/', SalonPage);

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection',
  validateSearch: validateCollectionSearch,
  component: lazyRouteComponent(
    () => import('../features/artworks/CollectionPage'),
    'CollectionPage',
  ),
});

const artworkRoute = route(
  '/artwork/$artworkId',
  lazyRouteComponent(() => import('../features/artworks/ArtworkDetailPage'), 'ArtworkDetailPage'),
);
const atlasRoute = route(
  '/atlas',
  lazyRouteComponent(() => import('../features/atlas/AtlasPage'), 'AtlasPage'),
);
const placeRoute = route(
  '/place/$placeId',
  lazyRouteComponent(() => import('../features/places/PlacePage'), 'PlacePage'),
);
const venueRoute = route(
  '/venue/$venueId',
  lazyRouteComponent(() => import('../features/places/VenuePage'), 'VenuePage'),
);
const journalRoute = route(
  '/journal',
  lazyRouteComponent(() => import('../features/journal/JournalPage'), 'JournalPage'),
);
const plannerRoute = route(
  '/planner',
  lazyRouteComponent(() => import('../features/planner/PlannerPage'), 'PlannerPage'),
);
const tripRoute = route(
  '/trip/$tripId',
  lazyRouteComponent(() => import('../features/planner/TripPage'), 'TripPage'),
);

const discoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/discover',
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    str(search.q) ? { q: str(search.q) } : {},
  component: lazyRouteComponent(() => import('../features/discover/DiscoverPage'), 'DiscoverPage'),
});

const insightsRoute = route(
  '/insights',
  lazyRouteComponent(() => import('../features/insights/InsightsPage'), 'InsightsPage'),
);
const settingsRoute = route(
  '/settings',
  lazyRouteComponent(() => import('../features/settings/SettingsPage'), 'SettingsPage'),
);

const routeTree = rootRoute.addChildren([
  salonRoute,
  collectionRoute,
  artworkRoute,
  atlasRoute,
  placeRoute,
  venueRoute,
  journalRoute,
  plannerRoute,
  tripRoute,
  discoverRoute,
  insightsRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultViewTransition: true,
  defaultErrorComponent: ErrorPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('notFound.title')}
      description={t('notFound.text')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('notFound.back')}</Link>
        </Button>
      }
    />
  );
}
