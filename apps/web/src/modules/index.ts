import { collectibleKinds } from '@mnemo/core';
import type { CollectibleViews } from '../app/collectibles';
import type { AppModule, DialogComponents } from '../app/modules';
import { artModule } from './art';
import { homeModule } from './home';
import { libraryModule } from './library';
import { peopleModule } from './people';
import { travelModule } from './travel';

/**
 * All modules of the app. A new area adds its module here and its routes in `app/router.tsx`;
 * navigation, quick add and dialogs pick it up automatically.
 */
export const appModules: readonly AppModule[] = [
  homeModule,
  artModule,
  libraryModule,
  peopleModule,
  travelModule,
];

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export const navEntries = appModules.flatMap((m) => m.nav ?? []).sort(byOrder);

export const quickAddEntries = appModules.flatMap((m) => m.quickAdd ?? []).sort(byOrder);

export const dialogComponents: DialogComponents = Object.assign(
  {},
  ...appModules.map((m) => m.dialogs ?? {}),
);

/** One view per collectible kind; a kind without a module to show it fails at startup. */
export const collectibleViews: CollectibleViews = (() => {
  const views: Partial<CollectibleViews> = Object.assign(
    {},
    ...appModules.map((m) => m.collectibles ?? {}),
  );
  const missing = collectibleKinds.filter((kind) => !views[kind]);
  if (missing.length > 0)
    throw new Error(`No module shows collectibles of kind ${missing.join(', ')}`);
  return views as CollectibleViews;
})();
