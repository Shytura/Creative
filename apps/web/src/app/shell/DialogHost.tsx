import { type ReactNode, useMemo, useState } from 'react';
import { ArtworkFormDialog } from '../../features/artworks/ArtworkForm';
import { CollectionFormDialog } from '../../features/artworks/CollectionForm';
import { PlaceFormDialog } from '../../features/places/PlaceForm';
import { VenueFormDialog } from '../../features/places/VenueForm';
import { VisitFormDialog } from '../../features/places/VisitForm';
import { TripFormDialog } from '../../features/planner/TripForm';
import { type DialogApi, DialogContext, type DialogSpec } from '../dialogs';

export function DialogHost({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<DialogSpec | null>(null);
  // Remount forms per opening so they start from fresh state.
  const [nonce, setNonce] = useState(0);

  const api = useMemo<DialogApi>(
    () => ({
      open: (next) => {
        setSpec(next);
        setNonce((n) => n + 1);
      },
      close: () => setSpec(null),
    }),
    [],
  );

  const onClose = api.close;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {spec?.type === 'artwork' && <ArtworkFormDialog key={nonce} spec={spec} onClose={onClose} />}
      {spec?.type === 'visit' && <VisitFormDialog key={nonce} spec={spec} onClose={onClose} />}
      {spec?.type === 'venue' && <VenueFormDialog key={nonce} spec={spec} onClose={onClose} />}
      {spec?.type === 'place' && <PlaceFormDialog key={nonce} spec={spec} onClose={onClose} />}
      {spec?.type === 'trip' && <TripFormDialog key={nonce} spec={spec} onClose={onClose} />}
      {spec?.type === 'collection' && (
        <CollectionFormDialog key={nonce} spec={spec} onClose={onClose} />
      )}
    </DialogContext.Provider>
  );
}
