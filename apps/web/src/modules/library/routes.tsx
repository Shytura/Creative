import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { rootRoute, route } from '../../app/root-route';
import { validateLibrarySearch } from '../../features/library/search';

export const libraryRoutes = [
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/library',
    validateSearch: validateLibrarySearch,
    component: lazyRouteComponent(
      () => import('../../features/library/LibraryPage'),
      'LibraryPage',
    ),
  }),
  route(
    '/book/$bookId',
    lazyRouteComponent(() => import('../../features/library/BookDetailPage'), 'BookDetailPage'),
  ),
] as const;
