import { createRouter } from '@tanstack/react-router';
import { artRoutes } from '../modules/art/routes';
import { homeRoutes } from '../modules/home/routes';
import { libraryRoutes } from '../modules/library/routes';
import { peopleRoutes } from '../modules/people/routes';
import { travelRoutes } from '../modules/travel/routes';
import { rootRoute } from './root-route';
import { ErrorPage } from './shell/ErrorPage';

/** Each module contributes its pages; add a module's routes here to make them reachable. */
const routeTree = rootRoute.addChildren([
  ...homeRoutes,
  ...artRoutes,
  ...libraryRoutes,
  ...peopleRoutes,
  ...travelRoutes,
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
