import type { ArtworkStatus, ItemRef } from '@mnemo/core';
import { ImagesIcon, SearchIcon } from 'lucide-react';
import { type AppModule, lazyDialog } from '../../app/modules';

declare module '../../app/dialogs' {
  interface DialogRegistry {
    artwork: {
      artworkId?: string;
      venueId?: string;
      visitId?: string;
      status?: ArtworkStatus;
      files?: File[];
    };
    collection: { collectionId?: string; addItem?: ItemRef };
  }
}

/** Artworks, lists and the museum search. */
export const artModule: AppModule = {
  id: 'art',
  nav: [
    {
      to: '/collection',
      navKey: 'collection',
      icon: ImagesIcon,
      order: 10,
      placement: 'main',
      mobile: true,
    },
    {
      to: '/discover',
      navKey: 'discover',
      icon: SearchIcon,
      order: 50,
      placement: 'main',
    },
  ],
  quickAdd: [
    {
      quickAddKey: 'artwork',
      icon: ImagesIcon,
      dialog: { type: 'artwork' },
      order: 10,
      group: 'record',
    },
  ],
  dialogs: {
    artwork: lazyDialog(
      () => import('../../features/artworks/ArtworkForm'),
      (m) => m.ArtworkFormDialog,
    ),
    collection: lazyDialog(
      () => import('../../features/artworks/CollectionForm'),
      (m) => m.CollectionFormDialog,
    ),
  },
};
