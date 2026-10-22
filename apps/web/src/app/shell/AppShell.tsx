import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  Button,
  cn,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
} from '@mnemo/ui';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  CompassIcon,
  EllipsisIcon,
  ImagesIcon,
  LandmarkIcon,
  MapIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  StampIcon,
} from 'lucide-react';
import { type ComponentType, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDialogs } from '../dialogs';
import { Background } from './Appearance';
import { DialogHost } from './DialogHost';

type NavKey = 'salon' | 'collection' | 'atlas' | 'journal' | 'planner' | 'discover';

const NAV: Array<{ to: string; key: NavKey; icon: ComponentType<{ className?: string }> }> = [
  { to: '/', key: 'salon', icon: LandmarkIcon },
  { to: '/collection', key: 'collection', icon: ImagesIcon },
  { to: '/atlas', key: 'atlas', icon: MapIcon },
  { to: '/journal', key: 'journal', icon: BookOpenIcon },
  { to: '/planner', key: 'planner', icon: CompassIcon },
  { to: '/discover', key: 'discover', icon: SearchIcon },
];

const MOBILE_NAV = NAV.filter((n) => n.key !== 'journal');

export function AppShell() {
  return (
    <DialogHost>
      <Background />
      <Layout />
      <UpdatePrompt />
    </DialogHost>
  );
}

function Layout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed = pathname.startsWith('/atlas');

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/72 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-6 px-5 md:px-10">
          <Link to="/" className="group flex items-baseline gap-2" aria-label="Mnemo">
            <span className="display text-[1.75rem] font-[420] italic tracking-tight">Mnemo</span>
            <span className="hidden size-1.5 rounded-full bg-accent transition-transform duration-500 group-hover:scale-150 sm:block" />
          </Link>

          <nav
            aria-label={t('nav.label')}
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="eyebrow relative px-3 py-2 text-ink-3 transition-colors hover:text-ink data-[status=active]:text-ink"
              >
                {({ isActive }) => (
                  <>
                    {t(`nav.${item.key}`)}
                    <span
                      className={cn(
                        'absolute inset-x-3 -bottom-[13px] h-px origin-left bg-accent transition-transform duration-500 ease-gallery',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </>
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <QuickAdd />
            <Tooltip content={t('nav.insights')}>
              <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
                <Link to="/insights" aria-label={t('nav.insights')}>
                  <ChartNoAxesColumnIcon />
                </Link>
              </Button>
            </Tooltip>
            <Tooltip content={t('nav.settings')}>
              <Button asChild variant="ghost" size="icon">
                <Link to="/settings" aria-label={t('nav.settings')}>
                  <Settings2Icon />
                </Link>
              </Button>
            </Tooltip>
            <Menu>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t('nav.more')}
                >
                  <EllipsisIcon />
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem asChild>
                  <Link to="/journal">
                    <BookOpenIcon /> {t('nav.journal')}
                  </Link>
                </MenuItem>
                <MenuItem asChild>
                  <Link to="/insights">
                    <ChartNoAxesColumnIcon /> {t('nav.insights')}
                  </Link>
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={cn(
          'flex-1',
          fullBleed
            ? 'flex flex-col'
            : 'mx-auto w-full max-w-[1480px] px-5 pt-10 pb-32 md:px-10 md:pt-14 lg:pb-20',
        )}
      >
        <Outlet />
      </main>

      {!fullBleed && (
        <footer className="mx-auto hidden w-full max-w-[1480px] items-center justify-between border-t border-line px-10 py-8 text-xs text-ink-3 lg:flex">
          <span className="caption text-sm">{t('footer.colophon')}</span>
          <span>{t('footer.local')}</span>
        </footer>
      )}

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full border border-line bg-surface/85 px-2 py-1.5 shadow-float backdrop-blur-xl lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-ink-3 transition-colors data-[status=active]:text-accent"
          >
            <item.icon className="size-5" />
            <span className="text-[0.625rem] font-medium">{t(`nav.${item.key}`)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function QuickAdd() {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  return (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <Button variant="accent" size="sm" className="mr-1 rounded-full pr-4 pl-3">
          <PlusIcon /> <span className="hidden sm:inline">{t('quickAdd.label')}</span>
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem onSelect={() => dialogs.open({ type: 'artwork' })}>
          <ImagesIcon /> {t('quickAdd.artwork')}
        </MenuItem>
        <MenuItem onSelect={() => dialogs.open({ type: 'visit' })}>
          <StampIcon /> {t('quickAdd.visit')}
        </MenuItem>
        <MenuItem onSelect={() => dialogs.open({ type: 'venue' })}>
          <MapPinIcon /> {t('quickAdd.venue')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => dialogs.open({ type: 'trip' })}>
          <CompassIcon /> {t('quickAdd.trip')}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast(t('pwa.update'), {
      duration: Number.POSITIVE_INFINITY,
      action: { label: t('pwa.reload'), onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
