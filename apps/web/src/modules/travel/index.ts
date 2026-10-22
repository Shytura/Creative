import { BookOpenIcon, CompassIcon, MapIcon, MapPinIcon, StampIcon } from 'lucide-react';
import { type AppModule, lazyDialog } from '../../app/modules';

declare module '../../app/dialogs' {
  interface DialogRegistry {
    visit: { visitId?: string; venueId?: string };
    venue: { venueId?: string; placeId?: string };
    place: { placeId?: string };
    trip: { tripId?: string };
  }
}

/** Places, museum visits, the journal and trip planning. */
export const travelModule: AppModule = {
  id: 'travel',
  nav: [
    { to: '/atlas', navKey: 'atlas', icon: MapIcon, order: 20, placement: 'main', mobile: true },
    { to: '/journal', navKey: 'journal', icon: BookOpenIcon, order: 30, placement: 'main' },
    {
      to: '/planner',
      navKey: 'planner',
      icon: CompassIcon,
      order: 40,
      placement: 'main',
      mobile: true,
    },
  ],
  quickAdd: [
    {
      quickAddKey: 'visit',
      icon: StampIcon,
      dialog: { type: 'visit' },
      order: 20,
      group: 'record',
    },
    {
      quickAddKey: 'venue',
      icon: MapPinIcon,
      dialog: { type: 'venue' },
      order: 30,
      group: 'record',
    },
    { quickAddKey: 'trip', icon: CompassIcon, dialog: { type: 'trip' }, order: 40, group: 'plan' },
  ],
  dialogs: {
    visit: lazyDialog(
      () => import('../../features/places/VisitForm'),
      (m) => m.VisitFormDialog,
    ),
    venue: lazyDialog(
      () => import('../../features/places/VenueForm'),
      (m) => m.VenueFormDialog,
    ),
    place: lazyDialog(
      () => import('../../features/places/PlaceForm'),
      (m) => m.PlaceFormDialog,
    ),
    trip: lazyDialog(
      () => import('../../features/planner/TripForm'),
      (m) => m.TripFormDialog,
    ),
  },
};
