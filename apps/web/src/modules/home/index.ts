import type { ItemRef } from '@mnemo/core';
import { ChartNoAxesColumnIcon, LandmarkIcon } from 'lucide-react';
import { type AppModule, lazyDialog } from '../../app/modules';

declare module '../../app/dialogs' {
  interface DialogRegistry {
    /** A list of collectibles of any kind; `addItem` puts one in right away. */
    collection: { collectionId?: string; addItem?: ItemRef };
  }
}

/** Salon, lists, insights and settings: the parts of Mnemo that span all collections. */
export const homeModule: AppModule = {
  id: 'home',
  dialogs: {
    collection: lazyDialog(
      () => import('../../features/lists/CollectionForm'),
      (m) => m.CollectionFormDialog,
    ),
  },
  nav: [
    { to: '/', navKey: 'salon', icon: LandmarkIcon, order: 0, placement: 'main', mobile: true },
    {
      to: '/insights',
      navKey: 'insights',
      icon: ChartNoAxesColumnIcon,
      order: 90,
      placement: 'secondary',
    },
  ],
};
