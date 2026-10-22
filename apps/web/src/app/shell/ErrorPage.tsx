import { Button, EmptyState } from '@mnemo/ui';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { DownloadIcon, RotateCwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { exportBackup } from '../../lib/archive-io';
import { useStore } from '../store';

/**
 * Shown when a route fails to render. The store still works, so the user can always save a
 * backup from here.
 */
export function ErrorPage({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const message = error instanceof Error ? error.message : String(error ?? '');

  useEffect(() => console.error(error), [error]);

  const backup = async () => {
    setBusy(true);
    try {
      await exportBackup(store);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl" role="alert">
      <p className="eyebrow pt-10 text-center text-accent">{t('error.eyebrow')}</p>
      <EmptyState
        className="pt-8"
        title={t('error.title')}
        description={t('error.text')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="accent" onClick={() => window.location.reload()}>
              <RotateCwIcon /> {t('error.reload')}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void backup()}>
              <DownloadIcon /> {t('error.backup')}
            </Button>
            <Button asChild variant="ghost">
              <a href="/">{t('error.home')}</a>
            </Button>
          </div>
        }
      />
      {message && (
        <details className="mx-6 mb-16 text-xs text-ink-3">
          <summary className="cursor-pointer">{t('error.details')}</summary>
          <pre className="mt-3 overflow-x-auto rounded-frame border border-line bg-paper-2/60 p-4 font-mono whitespace-pre-wrap">
            {message}
          </pre>
        </details>
      )}
    </div>
  );
}
