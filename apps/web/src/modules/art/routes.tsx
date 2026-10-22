import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { rootRoute, route } from '../../app/root-route';
import { validateCollectionSearch, validateDiscoverSearch } from '../../features/artworks/search';

export const artRoutes = [
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/collection',
    validateSearch: validateCollectionSearch,
    component: lazyRouteComponent(
      () => import('../../features/artworks/CollectionPage'),
      'CollectionPage',
    ),
  }),
  route(
    '/artwork/$artworkId',
    lazyRouteComponent(
      () => import('../../features/artworks/ArtworkDetailPage'),
      'ArtworkDetailPage',
    ),
  ),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/discover',
    validateSearch: validateDiscoverSearch,
    component: lazyRouteComponent(
      () => import('../../features/discover/DiscoverPage'),
      'DiscoverPage',
    ),
  }),
] as const;
