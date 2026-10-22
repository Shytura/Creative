import { lazyRouteComponent } from '@tanstack/react-router';
import { route } from '../../app/root-route';

export const travelRoutes = [
  route(
    '/atlas',
    lazyRouteComponent(() => import('../../features/atlas/AtlasPage'), 'AtlasPage'),
  ),
  route(
    '/place/$placeId',
    lazyRouteComponent(() => import('../../features/places/PlacePage'), 'PlacePage'),
  ),
  route(
    '/venue/$venueId',
    lazyRouteComponent(() => import('../../features/places/VenuePage'), 'VenuePage'),
  ),
  route(
    '/journal',
    lazyRouteComponent(() => import('../../features/journal/JournalPage'), 'JournalPage'),
  ),
  route(
    '/planner',
    lazyRouteComponent(() => import('../../features/planner/PlannerPage'), 'PlannerPage'),
  ),
  route(
    '/trip/$tripId',
    lazyRouteComponent(() => import('../../features/planner/TripPage'), 'TripPage'),
  ),
] as const;
