import { type ComponentType, type ReactNode, Suspense, useMemo, useState } from 'react';
import { dialogComponents } from '../../modules';
import { type DialogApi, DialogContext, type DialogProps, type DialogSpec } from '../dialogs';

type AnyDialog = ComponentType<
  Omit<DialogProps<DialogSpec['type']>, 'spec'> & { spec: DialogSpec }
>;

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

  const Dialog = spec ? (dialogComponents[spec.type] as AnyDialog | undefined) : undefined;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {spec && Dialog && (
        <Suspense fallback={null}>
          <Dialog key={nonce} spec={spec} onClose={api.close} />
        </Suspense>
      )}
    </DialogContext.Provider>
  );
}
