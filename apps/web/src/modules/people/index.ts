import { type AppModule, lazyDialog } from '../../app/modules';

declare module '../../app/dialogs' {
  interface DialogRegistry {
    /** `link` opens the dialog with a Wikidata search for the person's name. */
    creator: { creatorId: string; link?: boolean };
  }
}

/** People behind the works: artists today, authors once there is a library. */
export const peopleModule: AppModule = {
  id: 'people',
  dialogs: {
    creator: lazyDialog(
      () => import('../../features/creators/CreatorForm'),
      (m) => m.CreatorFormDialog,
    ),
  },
};
