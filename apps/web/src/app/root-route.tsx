import { Button, EmptyState } from '@mnemo/ui';
import { createRootRoute, createRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AppShell } from './shell/AppShell';
import { ErrorPage } from './shell/ErrorPage';

export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

/** A page directly below the app shell. Modules use this for their routes. */
export const route = <P extends string>(
  path: P,
  component: Parameters<typeof createRoute>[0]['component'],
) => createRoute({ getParentRoute: () => rootRoute, path, component });

function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('notFound.title')}
      description={t('notFound.text')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('notFound.back')}</Link>
        </Button>
      }
    />
  );
}
