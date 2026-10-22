import type { Dictionary } from '@mnemo/i18n';
import { type ComponentType, type LazyExoticComponent, lazy } from 'react';
import type { DialogProps, DialogSpec, DialogType } from './dialogs';

type Icon = ComponentType<{ className?: string }>;

export interface NavEntry {
  to: string;
  navKey: keyof Dictionary['nav'];
  icon: Icon;
  /** Position across all modules, ascending. */
  order: number;
  /** `main` sits in the header (desktop) and bottom bar (mobile); `secondary` is an icon or menu entry. */
  placement: 'main' | 'secondary';
  /** Main entries without this flag move into the "more" menu on small screens. */
  mobile?: boolean;
}

export interface QuickAddEntry {
  quickAddKey: Exclude<keyof Dictionary['quickAdd'], 'label'>;
  icon: Icon;
  dialog: DialogSpec;
  order: number;
  /** Entries of different groups are separated in the menu. */
  group: 'record' | 'plan';
}

export type DialogComponents = {
  [K in DialogType]?:
    | ComponentType<DialogProps<K>>
    | LazyExoticComponent<ComponentType<DialogProps<K>>>;
};

/**
 * What a module contributes to the app shell. Its pages live next to it in `routes.tsx` and are
 * registered in `app/router.tsx`.
 */
export interface AppModule {
  id: string;
  nav?: NavEntry[];
  quickAdd?: QuickAddEntry[];
  dialogs?: DialogComponents;
}

/** Loads a dialog component on first use so forms stay out of the initial bundle. */
export function lazyDialog<K extends DialogType, M>(
  load: () => Promise<M>,
  pick: (module: M) => ComponentType<DialogProps<K>>,
) {
  return lazy(async () => ({ default: pick(await load()) }));
}
