import type { ItemRef } from '@mnemo/core';
import { createContext, useContext } from 'react';

/** Global create/edit dialogs, reachable from anywhere (quick add, detail pages, …). */
export type DialogSpec =
  | {
      type: 'artwork';
      artworkId?: string;
      venueId?: string;
      visitId?: string;
      status?: 'seen' | 'wishlist';
      files?: File[];
    }
  | { type: 'visit'; visitId?: string; venueId?: string }
  | { type: 'venue'; venueId?: string; placeId?: string }
  | { type: 'place'; placeId?: string }
  | { type: 'trip'; tripId?: string }
  | { type: 'collection'; collectionId?: string; addItem?: ItemRef };

export interface DialogProps<T extends DialogSpec['type']> {
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
