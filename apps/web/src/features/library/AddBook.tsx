import { normalizeIsbn } from '@mnemo/core';
import { availableBookProviders, type BookSearchResult, lookupIsbn } from '@mnemo/providers';
import { Button, Dialog, DialogContent, Input, Spinner } from '@mnemo/ui';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BarcodeIcon, SearchIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBooks, useProviderContext } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useDialogs } from '../../app/dialogs';
import { BookCover } from '../../components/BookCover';
import { ErrorNote } from '../../components/bits';
import { useFormat } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';

/**
 * One field for everything: an ISBN is looked up directly in all catalogues, anything else
 * searches them. Picking a result opens the book form prefilled, so it can be adjusted first.
 */
export function AddBookDialog({ spec, onClose }: DialogProps<'addBook'>) {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const ctx = useProviderContext();
  const [text, setText] = useState('');
  const input = useDebounced(text.trim(), 350);
  const isbn = normalizeIsbn(input);
  const providers = useMemo(() => availableBookProviders(ctx.keys), [ctx.keys]);

  const lookup = useQuery({
    queryKey: ['book-isbn', isbn, ctx.locale],
    queryFn: ({ signal }) => lookupIsbn(isbn!, { ...ctx, signal }),
    enabled: Boolean(isbn),
    staleTime: 24 * 60 * 60_000,
    retry: 0,
  });

  const searches = useQueries({
    queries: providers.map((p) => ({
      queryKey: ['book-search', p.id, input, ctx.locale],
      queryFn: ({ signal }: { signal: AbortSignal }) => p.search(input, { ...ctx, signal }),
      enabled: !isbn && input.length >= 3,
      staleTime: 60 * 60_000,
      retry: 0,
    })),
  });

  // Round-robin across catalogues; the same edition (by ISBN) is shown once.
  const results = useMemo(() => {
    const lists = searches.map((s) => s.data ?? []);
    const seen = new Set<string>();
    const out: BookSearchResult[] = [];
    for (let row = 0; lists.some((l) => row < l.length); row++) {
      for (const list of lists) {
        const item = list[row];
        const key = item && (item.isbn ?? `${item.provider}:${item.externalId}`);
        if (item && key && !seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
    }
    return out;
  }, [searches]);

  const pick = (prefill: Partial<BookSearchResult>) =>
    dialogs.open({ type: 'book', prefill, ownership: spec.ownership });

  const searching = !isbn && input.length >= 3;
  const fetching = lookup.isFetching || searches.some((s) => s.isFetching);
  const allFailed = searching && searches.length > 0 && searches.every((s) => s.isError);

  let body: ReactNode = <p className="caption text-ink-3">{t('book.add.hint')}</p>;
  if (isbn) {
    body = lookup.isError ? (
      <ErrorNote onRetry={() => void lookup.refetch()}>{t('book.add.failed')}</ErrorNote>
    ) : lookup.data ? (
      <div>
        <p className="eyebrow mb-2 text-accent">{t('book.add.isbnFound')}</p>
        <ul>
          <ResultRow result={lookup.data} onPick={pick} />
        </ul>
      </div>
    ) : lookup.isSuccess ? (
      <p className="caption text-ink-3">{t('book.add.isbnUnknown')}</p>
    ) : null;
  } else if (searching) {
    body = allFailed ? (
      <ErrorNote onRetry={() => searches.forEach((s) => void s.refetch())}>
        {t('book.add.failed')}
      </ErrorNote>
    ) : results.length > 0 ? (
      <ul className="divide-y divide-line">
        {results.map((r) => (
          <ResultRow key={`${r.provider}:${r.externalId}`} result={r} onPick={pick} />
        ))}
      </ul>
    ) : !fetching ? (
      <p className="caption text-ink-3">{t('book.add.noResults')}</p>
    ) : null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        eyebrow={t('book.add.eyebrow')}
        title={t('book.add.title')}
        footer={
          <>
            <span className="mr-auto text-xs text-ink-3">
              {t('book.add.searched', { names: providers.map((p) => p.name).join(', ') })}
            </span>
            <Button
              variant="outline"
              onClick={() => pick(isbn ? { isbn } : input ? { title: input } : {})}
            >
              {t('book.add.manual')}
            </Button>
          </>
        }
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('book.add.placeholder')}
            aria-label={t('book.add.placeholder')}
            className="h-12 rounded-full pr-12 pl-10 text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {isbn ? (
            <BarcodeIcon className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-accent" />
          ) : fetching ? (
            <Spinner className="absolute top-1/2 right-4 size-4 -translate-y-1/2" />
          ) : null}
        </div>
        <div className="mt-6 min-h-24">{body}</div>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({
  result,
  onPick,
}: {
  result: BookSearchResult;
  onPick: (result: BookSearchResult) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const dialogs = useDialogs();
  const books = useBooks();
  const owned = result.isbn
    ? books?.find((b) => b.isbn === normalizeIsbn(result.isbn!))
    : undefined;
  const cover = {
    id: result.externalId,
    title: result.title,
    authors: result.authors,
    mediaIds: [],
  };
  return (
    <li className="flex items-center gap-4 py-3">
      <BookCover book={cover} src={result.coverUrl} className="w-12 shrink-0 shadow-soft" />
      <div className="min-w-0 flex-1">
        <p className="caption truncate text-lg leading-snug">{result.title}</p>
        {result.authors.length > 0 && (
          <p className="truncate text-sm text-ink-2">{result.authors.join(', ')}</p>
        )}
        <p className="truncate text-xs text-ink-3">
          {[result.year, result.publisher, format.language(result.language)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {owned ? (
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[0.6875rem] text-ink-3">{t('book.add.owned')}</span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/book/$bookId" params={{ bookId: owned.id }} onClick={dialogs.close}>
              {t('book.add.open')}
            </Link>
          </Button>
        </span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => onPick(result)}>
          {t('book.add.pick')}
        </Button>
      )}
    </li>
  );
}
