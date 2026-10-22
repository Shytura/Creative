import type { EntityTable, MnemoStore } from '@mnemo/core';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

const StoreContext = createContext<MnemoStore | null>(null);

/**
 * Makes a Mnemo store available to all features. Any implementation of `MnemoStore` works,
 * which is how a host app can plug in its own backend.
 */
export function MnemoProvider({ store, children }: { store: MnemoStore; children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(
    () => store.subscribe((tables) => invalidate(queryClient, tables)),
    [store, queryClient],
  );
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): MnemoStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <MnemoProvider>');
  return store;
}

/** Local queries are keyed `['local', table, ...]`; derived queries spanning tables use `'all'`. */
function invalidate(client: QueryClient, tables: EntityTable[]) {
  for (const table of tables) void client.invalidateQueries({ queryKey: ['local', table] });
  void client.invalidateQueries({ queryKey: ['local', 'all'] });
}
