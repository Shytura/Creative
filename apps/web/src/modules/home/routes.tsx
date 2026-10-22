import { lazyRouteComponent } from '@tanstack/react-router';
import { route } from '../../app/root-route';
import { SalonPage } from '../../features/home/SalonPage';

export const homeRoutes = [
  route('/', SalonPage),
  route(
    '/list/$collectionId',
    lazyRouteComponent(() => import('../../features/lists/ListPage'), 'ListPage'),
  ),
  route(
    '/insights',
    lazyRouteComponent(() => import('../../features/insights/InsightsPage'), 'InsightsPage'),
  ),
  route(
    '/settings',
    lazyRouteComponent(() => import('../../features/settings/SettingsPage'), 'SettingsPage'),
  ),
] as const;
