import { lazyRouteComponent } from '@tanstack/react-router';
import { route } from '../../app/root-route';

export const peopleRoutes = [
  route(
    '/creator/$creatorId',
    lazyRouteComponent(() => import('../../features/creators/CreatorPage'), 'CreatorPage'),
  ),
] as const;
