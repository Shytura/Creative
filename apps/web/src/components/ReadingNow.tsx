import type { Book } from '@mnemo/core';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BookCover } from './BookCover';

/** The books on the nightstand, with how far along they are. */
export function ReadingNow({
  books,
  className,
  bare,
}: {
  books: Book[];
  className?: string;
  /** Without its own label, under a section title of the page. */
  bare?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('library.reading')} className={className}>
      {!bare && <p className="eyebrow mb-4 text-accent">{t('library.reading')}</p>}
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {books.map((b) => {
          const progress =
            b.currentPage && b.pageCount ? Math.min(1, b.currentPage / b.pageCount) : undefined;
          return (
            <Link
              key={b.id}
              to="/book/$bookId"
              params={{ bookId: b.id }}
              className="group flex w-[min(22rem,85%)] shrink-0 snap-start items-center gap-4 rounded-frame border border-line bg-surface p-3 shadow-soft transition-shadow hover:shadow-frame"
            >
              <BookCover book={b} className="w-16 shrink-0 shadow-soft" />
              <div className="min-w-0 flex-1">
                <p className="caption truncate text-lg leading-snug group-hover:text-accent">
                  {b.title}
                </p>
                <p className="truncate text-xs text-ink-3">{b.authors.join(', ')}</p>
                {progress !== undefined && (
                  <>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] text-ink-3 tabular-nums">
                      {t('library.pageOf', { page: b.currentPage, total: b.pageCount })}
                    </p>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
