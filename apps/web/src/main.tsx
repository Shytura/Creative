import { createDexieStore } from '@mnemo/storage-dexie';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import './styles.css';

const store = createDexieStore('mnemo');

// A view transition interrupted by a resize or a quick second navigation rejects with
// InvalidStateError/AbortError. That is expected and harmless, so keep it out of the console.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as Error | undefined;
  if (/Transition was (aborted|skipped)/.test(reason?.message ?? '')) event.preventDefault();
});

// Ask the browser to keep IndexedDB data even under storage pressure.
void navigator.storage?.persist?.();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

createRoot(root).render(
  <StrictMode>
    <AppProviders store={store}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
