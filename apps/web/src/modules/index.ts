import type { AppModule, DialogComponents } from '../app/modules';
import { artModule } from './art';
import { homeModule } from './home';
import { travelModule } from './travel';

/**
 * All modules of the app. A new area (e.g. a library) adds its module here and its routes in
 * `app/router.tsx`; navigation, quick add and dialogs pick it up automatically.
 */
export const appModules: readonly AppModule[] = [homeModule, artModule, travelModule];

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export const navEntries = appModules.flatMap((m) => m.nav ?? []).sort(byOrder);

export const quickAddEntries = appModules.flatMap((m) => m.quickAdd ?? []).sort(byOrder);

export const dialogComponents: DialogComponents = Object.assign(
  {},
  ...appModules.map((m) => m.dialogs ?? {}),
);
