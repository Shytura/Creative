import type { MnemoStore } from '@mnemo/core';
import { createI18n, resolveLocale } from '@mnemo/i18n';
import { TooltipProvider } from '@mnemo/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Toaster } from 'sonner';
import { Appearance } from './shell/Appearance';
import { MnemoProvider } from './store';

/** Everything the Mnemo features need. Host apps can wrap their own UI with this. */
export function AppProviders({ store, children }: { store: MnemoStore; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10 * 60_000 },
        },
      }),
  );
  const [i18n] = useState(() =>
    createI18n(resolveLocale('system', navigator.language), [initReactI18next]),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MnemoProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider delayDuration={350}>
            <Appearance />
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{
                className:
                  '!rounded-[3px] !border-line !bg-surface !text-ink !shadow-frame !font-sans',
              }}
            />
          </TooltipProvider>
        </I18nextProvider>
      </MnemoProvider>
    </QueryClientProvider>
  );
}
