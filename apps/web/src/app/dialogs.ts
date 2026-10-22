import { createContext, useContext } from 'react';

/**
 * Global create/edit dialogs, reachable from anywhere (quick add, detail pages, …). Each module
 * declares its dialogs and their parameters by augmenting this interface:
 *
 * ```ts
 * declare module '../../app/dialogs' {
 *   interface DialogRegistry { book: { bookId?: string } }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: filled by module augmentation
export interface DialogRegistry {}

export type DialogType = keyof DialogRegistry;

export type DialogSpec = { [K in DialogType]: { type: K } & DialogRegistry[K] }[DialogType];

export interface DialogProps<T extends DialogType> {
  spec: Extract<DialogSpec, { type: T }>;
  onClose: () => void;
}

export interface DialogApi {
  open: (spec: DialogSpec) => void;
  close: () => void;
}

export const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialogs must be used inside <DialogHost>');
  return api;
}
