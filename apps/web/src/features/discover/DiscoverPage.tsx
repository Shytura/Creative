import type { ArtworkStatus } from '@mnemo/core';
import {
  type ArtworkSearchProvider,
  type ArtworkSearchResult,
  availableArtProviders,
} from '@mnemo/providers';
import { Button, Chip, cn, Dialog, DialogContent, EmptyState, Spinner } from '@mnemo/ui';
import { useQueries } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
  CheckIcon,
  SearchIcon,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtworks, useProviderContext } from '../../app/data';
import { RemoteImage } from '../../components/MediaImage';
import { AddFromDiscover } from './AddFromDiscover';

const routeApi = getRouteApi('/discover');
const SUGGESTIONS = [
  'Vermeer',
  'Hokusai',
  'Klimt',
  'Sternennacht',
  'Seerosen',
  'Frida Kahlo',
  'Caspar David Friedrich',
  'Hopper',
];

export function DiscoverPage() {
  const { t } = useTranslation();
  const { q } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const ctx = useProviderContext();
  const artworks = useArtworks();
  const [input, setInput] = useState(q ?? '');
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ArtworkSearchResult | null>(null);
  const [adding, setAdding] = useState<{
    result: ArtworkSearchResult;
    status: ArtworkStatus;
  } | null>(null);

  const providers = useMemo(() => availableArtProviders(ctx.keys), [ctx.keys]);
  const query = q?.trim() ?? '';

  const results = useQueries({
    queries: providers.map((p) => ({
      queryKey: ['art-search', p.id, query, ctx.locale],
      queryFn: ({ signal }: { signal: AbortSignal }) => p.search(query, { ...ctx, signal }),
      enabled: query.length >= 2,
      staleTime: 60 * 60_000,
      retry: 0,
    })),
  });

  const owned = useMemo(
    () =>
      new Set(
        (artworks ?? []).flatMap((a) =>
          a.source ? [`${a.source.provider}:${a.source.externalId}`] : [],
        ),
      ),
    [artworks],
  );

  // Round-robin merge keeps the grid varied instead of one museum after another.
  const merged = useMemo(() => {
    const lists = providers.map((p, i) => (disabled.has(p.id) ? [] : (results[i]?.data ?? [])));
    const out: ArtworkSearchResult[] = [];
    for (let row = 0; lists.some((l) => row < l.length); row++) {
      for (const list of lists) {
        const item = list[row];
        if (item) out.push(item);
      }
    }
    return out;
  }, [providers, results, disabled]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void navigate({ search: input.trim() ? { q: input.trim() } : {} });
  };

  const loading = results.some((r) => r.isFetching);

  return (
    <>
      <header className="mx-auto max-w-4xl animate-rise pt-4 text-center md:pt-10">
        <p className="eyebrow text-accent">{t('discover.eyebrow')}</p>
        <h1 className="display mt-5 text-[clamp(3rem,8vw,6.5rem)] font-[340]">
          {t('discover.title')}
        </h1>
        <p className="caption mx-auto mt-5 max-w-2xl text-xl text-ink-2">{t('discover.lede')}</p>
        <form onSubmit={submit} className="relative mx-auto mt-10 max-w-2xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('discover.placeholder')}
            aria-label={t('discover.placeholder')}
            className="h-16 w-full rounded-full border border-line-strong bg-surface/80 pr-36 pl-15 font-display text-xl italic shadow-soft backdrop-blur transition-colors placeholder:text-ink-3 focus:border-ink focus:outline-none"
          />
          <Button type="submit" className="absolute top-2 right-2 h-12 rounded-full px-6">
            {loading ? (
              <Spinner className="size-4 border-paper/40 border-t-paper" />
            ) : (
              t('discover.search')
            )}
          </Button>
        </form>
        {!query && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                onClick={() => {
                  setInput(s);
                  void navigate({ search: { q: s } });
                }}
              >
                {s}
              </Chip>
            ))}
          </div>
        )}
      </header>

      {query && (
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2 border-y border-line py-4">
          {providers.map((p, i) => (
            <ProviderChip
              key={p.id}
              provider={p}
              active={!disabled.has(p.id)}
              loading={results[i]?.isFetching ?? false}
              error={results[i]?.isError ?? false}
              count={results[i]?.data?.length}
              onClick={() =>
                setDisabled((set) => {
                  const next = new Set(set);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                })
              }
            />
          ))}
        </div>
      )}

      {query && !loading && merged.length === 0 && (
        <EmptyState title={t('discover.noResults')} description={t('discover.noResultsText')} />
      )}

      <div className="masonry mt-12 columns-2 gap-6 md:columns-3 xl:columns-4">
        {merged.map((r) => (
          <ResultCard
            key={`${r.provider}:${r.externalId}`}
            result={r}
            owned={owned.has(`${r.provider}:${r.externalId}`)}
            onPreview={() => setPreview(r)}
            onAdd={(status) => setAdding({ result: r, status })}
          />
        ))}
      </div>

      {!query && (
        <section className="mx-auto mt-24 grid max-w-5xl gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <a
              key={p.id}
              href={p.homepage}
              target="_blank"
              rel="noreferrer"
              className="group bg-paper p-6 transition-colors hover:bg-surface"
            >
              <p className="display text-xl font-[440] group-hover:text-accent">{p.name}</p>
              <p className="mt-2 text-xs text-ink-3">
                {t(`discover.providers.${p.id}`, { defaultValue: '' })}
              </p>
            </a>
          ))}
        </section>
      )}

      {preview && (
        <PreviewDialog
          result={preview}
          owned={owned.has(`${preview.provider}:${preview.externalId}`)}
          onClose={() => setPreview(null)}
          onAdd={(status) => {
            setPreview(null);
            setAdding({ result: preview, status });
          }}
        />
      )}
      {adding && (
        <AddFromDiscover
          result={adding.result}
          initialStatus={adding.status}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  );
}

function ProviderChip({
  provider,
  active,
  loading,
  error,
  count,
  onClick,
}: {
  provider: ArtworkSearchProvider;
  active: boolean;
  loading: boolean;
  error: boolean;
  count: number | undefined;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Chip active={active} onClick={onClick} title={error ? t('discover.providerError') : undefined}>
      {provider.name}
      {loading ? (
        <Spinner className="size-3 border" />
      ) : error ? (
        <AlertCircleIcon className="size-3.5 text-danger" />
      ) : count !== undefined ? (
        <span className="opacity-50 tabular-nums">{count}</span>
      ) : null}
    </Chip>
  );
}

function ResultCard({
  result,
  owned,
  onPreview,
  onAdd,
}: {
  result: ArtworkSearchResult;
  owned: boolean;
  onPreview: () => void;
  onAdd: (status: ArtworkStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <figure className="group mb-10 animate-fade">
      <div className="relative">
        <button
          type="button"
          onClick={onPreview}
          className="block w-full cursor-zoom-in"
          aria-label={result.title}
        >
          <RemoteImage
            src={result.thumbnailUrl ?? result.imageUrl}
            alt={result.title}
            className="min-h-32 shadow-frame"
            imgClassName="h-auto"
            fallback={
              <div className="flex aspect-[4/5] items-end p-5">
                <span className="display line-clamp-4 text-2xl font-[340] italic text-ink-3">
                  {result.title}
                </span>
              </div>
            }
          />
        </button>
        <div className="absolute inset-x-3 bottom-3 flex justify-end gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          {owned ? (
            <span className="flex items-center gap-1 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-soft">
              <CheckIcon className="size-3.5 text-accent" /> {t('discover.owned')}
            </span>
          ) : (
            <>
              <Button
                size="sm"
                variant="accent"
                className="rounded-full shadow-frame"
                onClick={() => onAdd('seen')}
              >
                <CheckIcon /> {t('discover.seen')}
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-surface text-ink shadow-frame hover:bg-surface/90"
                onClick={() => onAdd('wishlist')}
              >
                <BookmarkIcon /> {t('discover.want')}
              </Button>
            </>
          )}
        </div>
      </div>
      <figcaption className="mt-3.5 space-y-1">
        <p className="caption text-[1.0625rem] leading-snug">{result.title}</p>
        <p className="text-xs text-ink-2">
          {[result.artist, result.year].filter(Boolean).join(', ')}
        </p>
        <p className="eyebrow pt-0.5 text-[0.625rem] text-ink-3">{result.museumName}</p>
      </figcaption>
    </figure>
  );
}

function PreviewDialog({
  result,
  owned,
  onClose,
  onAdd,
}: {
  result: ArtworkSearchResult;
  owned: boolean;
  onClose: () => void;
  onAdd: (status: ArtworkStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="xl"
        eyebrow={result.museumName}
        title={result.title}
        footer={
          owned ? (
            <Button asChild variant="outline">
              <Link to="/collection" search={{ q: result.title }}>
                <CheckIcon /> {t('discover.owned')}
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onAdd('wishlist')}>
                <BookmarkIcon /> {t('discover.want')}
              </Button>
              <Button variant="accent" onClick={() => onAdd('seen')}>
                <CheckIcon /> {t('discover.seen')}
              </Button>
            </>
          )
        }
      >
        <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
          <div className="flex items-center justify-center bg-paper-2/60 p-4">
            <img
              src={result.imageUrl ?? result.thumbnailUrl}
              alt={result.title}
              referrerPolicy="no-referrer"
              className="max-h-[60vh] w-auto object-contain shadow-frame"
            />
          </div>
          <dl className="space-y-4 text-sm">
            {[
              [t('artwork.fields.artist'), result.artist],
              [t('artwork.fields.year'), result.year],
              [t('artwork.fields.medium'), result.medium],
              [t('artwork.fields.venue'), result.museumName],
              [t('discover.license'), result.license],
              [t('discover.credit'), result.credit],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="border-b border-line pb-3">
                  <dt className="eyebrow text-ink-3">{label}</dt>
                  <dd
                    className={cn(
                      'mt-1',
                      label === t('artwork.fields.artist') && 'caption text-lg',
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ) : null,
            )}
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="eyebrow inline-flex items-center gap-1 text-ink-2 hover:text-accent"
              >
                {t('discover.source')} <ArrowUpRightIcon className="size-3" />
              </a>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
