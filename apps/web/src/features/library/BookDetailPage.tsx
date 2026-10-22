import {
  type Book,
  type BookStatus,
  collectionHas,
  type ItemRef,
  removeBook,
  removeQuote,
  returnBook,
  setReadingStatus,
  todayIsoDate,
  toggleInCollection,
} from '@mnemo/core';
import { bookProviders } from '@mnemo/providers';
import {
  Button,
  Chip,
  cn,
  EmptyState,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  Rating,
  SectionTitle,
  Segmented,
  Skeleton,
  Tag,
  Tooltip,
} from '@mnemo/ui';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  EllipsisIcon,
  HandshakeIcon,
  HeartIcon,
  ListPlusIcon,
  PencilIcon,
  QuoteIcon,
  Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBook, useBooks, useCollections, useCreators } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { BookCard } from '../../components/BookCard';
import { BookCover } from '../../components/BookCover';
import { Confirm, Fact } from '../../components/bits';
import { usePaletteAccent } from '../../lib/accent';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/book/$bookId');

const STATUSES: BookStatus[] = ['unread', 'reading', 'read', 'abandoned'];

export function BookDetailPage() {
  const { t } = useTranslation();
  const { bookId } = routeApi.useParams();
  const query = useBook(bookId);
  const book = query.data;
  const store = useStore();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const format = useFormat();
  const collections = useCollections();
  const creators = useCreators();
  const allBooks = useBooks();
  const accentStyle = usePaletteAccent(book?.palette);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const moreByAuthor = useMemo(() => {
    if (!book || !allBooks) return [];
    return allBooks
      .filter((b) => b.id !== book.id && b.creatorIds.some((id) => book.creatorIds.includes(id)))
      .slice(0, 5);
  }, [book, allBooks]);

  if (query.isPending) {
    return (
      <div className="grid gap-12 md:grid-cols-[18rem_1fr]">
        <Skeleton className="aspect-[2/3]" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <EmptyState
        title={t('book.notFound')}
        action={
          <Button asChild variant="outline">
            <Link to="/library">{t('book.backToLibrary')}</Link>
          </Button>
        }
      />
    );
  }

  const ref: ItemRef = { kind: 'book', id: book.id };
  const memberOf = (collections ?? []).filter((c) => collectionHas(c, ref));
  const authorLinks = book.authors.map((name, i) => ({
    name,
    creator: creators?.find((c) => c.id === book.creatorIds[i]),
  }));
  const firstAuthor = authorLinks[0]?.creator?.name ?? book.authors[0];
  const provider = bookProviders.find((p) => p.id === book.source?.provider);

  const changeStatus = async (status: BookStatus) => {
    await setReadingStatus(store, book.id, status);
    if (status === 'read') toast.success(t('book.eyebrow.read'));
  };

  return (
    <article style={accentStyle}>
      <Link
        to="/library"
        className="eyebrow mb-8 inline-flex items-center gap-2 text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" /> {t('nav.library')}
      </Link>

      <div className="grid gap-10 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-14 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-64 md:max-w-none">
          <BookCover
            book={book}
            variant="full"
            eager
            className="shadow-float"
            style={{ viewTransitionName: `book-${book.id}` }}
          />
          {book.palette.length > 0 && (
            <div className="mt-4 flex h-2 overflow-hidden rounded-full">
              {book.palette.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
          )}
        </div>

        <section className="min-w-0">
          <p className="eyebrow mb-4 text-accent">
            <StatusLine book={book} />
          </p>
          <h1 className="display text-[clamp(2.25rem,5vw,4rem)] font-[380] animate-rise">
            {book.title}
          </h1>
          {book.subtitle && <p className="caption mt-2 text-xl text-ink-3">{book.subtitle}</p>}
          {authorLinks.length > 0 && (
            <p className="caption mt-4 text-2xl text-ink-2">
              {authorLinks.map(({ name, creator }, i) => (
                <span key={name}>
                  {i > 0 && ', '}
                  {creator ? (
                    <Link
                      to="/creator/$creatorId"
                      params={{ creatorId: creator.id }}
                      className="underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors hover:text-ink hover:decoration-accent"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
              ))}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Tooltip content={book.favorite ? t('book.unfavorite') : t('book.favorite')}>
              <Button
                variant={book.favorite ? 'accent' : 'outline'}
                size="icon"
                className="rounded-full"
                aria-pressed={book.favorite}
                aria-label={t('book.favorite')}
                onClick={() => void store.books.update(book.id, { favorite: !book.favorite })}
              >
                <HeartIcon className={cn(book.favorite && 'fill-current')} />
              </Button>
            </Tooltip>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => dialogs.open({ type: 'quote', bookId: book.id })}
            >
              <QuoteIcon /> {t('book.addQuote')}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => dialogs.open({ type: 'book', bookId: book.id })}
            >
              <PencilIcon /> {t('common.edit')}
            </Button>
            <Menu modal={false}>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('common.more')}
                >
                  <EllipsisIcon />
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>{t('book.fields.collections')}</MenuLabel>
                {collections?.map((c) => (
                  <MenuItem
                    key={c.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      void toggleInCollection(store, c.id, ref);
                    }}
                  >
                    <CheckIcon className={cn(!collectionHas(c, ref) && 'opacity-0')} /> {c.name}
                  </MenuItem>
                ))}
                <MenuItem onSelect={() => dialogs.open({ type: 'collection', addItem: ref })}>
                  <ListPlusIcon /> {t('collection.new')}
                </MenuItem>
                <MenuSeparator />
                {book.ownership === 'owned' && !book.loan && (
                  <MenuItem onSelect={() => dialogs.open({ type: 'loan', bookId: book.id })}>
                    <HandshakeIcon /> {t('book.lend')}
                  </MenuItem>
                )}
                <MenuItem className="text-danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2Icon /> {t('common.delete')}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>

          {book.loan && <LoanNote book={book} />}

          <div className="mt-10 space-y-5 border-t border-line pt-6">
            <Segmented
              aria-label={t('book.fields.status')}
              value={book.status}
              onChange={(s) => void changeStatus(s)}
              options={STATUSES.map((s) => ({ value: s, label: t(`book.status.${s}`) }))}
              className="max-w-full overflow-x-auto"
            />
            {book.status === 'reading' && <Progress book={book} />}
            <div className="flex items-center gap-4">
              <span className="eyebrow text-ink-3">{t('book.fields.rating')}</span>
              <Rating
                label={t('book.fields.rating')}
                value={book.rating}
                onChange={(rating) => void store.books.update(book.id, { rating })}
              />
            </div>
          </div>

          <dl className="mt-8 border-t border-line">
            <Fact label={t('book.fields.publisher')}>{book.publisher}</Fact>
            <Fact label={t('book.fields.year')}>{book.year}</Fact>
            <Fact label={t('book.fields.pages')}>
              {book.pageCount && format.number(book.pageCount)}
            </Fact>
            <Fact label={t('book.fields.language')}>{format.language(book.language)}</Fact>
            <Fact label={t('book.fields.format')}>
              {book.format && t(`book.formats.${book.format}`)}
            </Fact>
            <Fact label={t('book.fields.ownership')}>{t(`book.ownership.${book.ownership}`)}</Fact>
            <Fact label={t('book.fields.isbn')}>
              {book.isbn && <span className="font-mono text-xs tracking-wide">{book.isbn}</span>}
            </Fact>
            <Fact label={t('book.fields.source')}>
              {book.source && (
                <a
                  href={book.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                >
                  {provider?.name ?? book.source.provider} <ArrowUpRightIcon className="size-3" />
                </a>
              )}
            </Fact>
          </dl>

          {book.readings.length > 0 && <Readings book={book} />}

          {book.description && (
            <div className="mt-10">
              <p className="eyebrow mb-3 text-ink-3">{t('book.fields.description')}</p>
              <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-ink-2">
                {book.description}
              </p>
            </div>
          )}

          {book.notes && (
            <blockquote className="mt-10 border-l-2 border-gold pl-5 font-display text-lg leading-relaxed whitespace-pre-line text-ink-2 italic">
              {book.notes}
            </blockquote>
          )}

          {(book.tags.length > 0 || memberOf.length > 0) && (
            <div className="mt-8 flex flex-wrap gap-2">
              {memberOf.map((c) => (
                <Link key={c.id} to="/list/$collectionId" params={{ collectionId: c.id }}>
                  <Chip>{c.name}</Chip>
                </Link>
              ))}
              {book.tags.map((tag) => (
                <Link key={tag} to="/library" search={{ tag }}>
                  <Tag className="hover:border-ink-3">#{tag}</Tag>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <Quotes book={book} />

      {moreByAuthor.length > 0 && (
        <section className="mt-24">
          <SectionTitle>{t('book.moreBy', { author: firstAuthor })}</SectionTitle>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {moreByAuthor.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      <Confirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('book.deleteTitle')}
        description={t('book.deleteText', { title: book.title })}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          await removeBook(store, book.id);
          toast.success(t('book.deleted'));
          void navigate({ to: '/library' });
        }}
      />
    </article>
  );
}

function StatusLine({ book }: { book: Book }) {
  const { t } = useTranslation();
  const format = useFormat();
  if (book.ownership === 'wishlist' && book.status === 'unread') return t('book.eyebrow.wishlist');
  const last = book.readings.at(-1);
  switch (book.status) {
    case 'reading':
      return last?.startedOn
        ? t('book.eyebrow.readingSince', { date: format.date(last.startedOn) })
        : t('book.eyebrow.reading');
    case 'read':
      return last?.finishedOn
        ? t('book.eyebrow.readOn', { date: format.date(last.finishedOn) })
        : t('book.eyebrow.read');
    case 'abandoned':
      return t('book.eyebrow.abandoned');
    default:
      return t('book.eyebrow.unread');
  }
}

/** Current page with a thin progress line; saved when the field loses focus. */
function Progress({ book }: { book: Book }) {
  const { t } = useTranslation();
  const store = useStore();
  const [page, setPage] = useState(book.currentPage ? String(book.currentPage) : '');
  const progress =
    book.currentPage && book.pageCount ? Math.min(1, book.currentPage / book.pageCount) : 0;

  const save = () => {
    const value = Number(page);
    const next = page.trim() && Number.isInteger(value) && value >= 0 ? value : undefined;
    if (next !== book.currentPage) void store.books.update(book.id, { currentPage: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <label htmlFor="book-page" className="eyebrow text-ink-3">
          {t('book.fields.currentPage')}
        </label>
        <Input
          id="book-page"
          inputMode="numeric"
          value={page}
          onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-8 w-20 text-center tabular-nums"
        />
        {book.pageCount && (
          <span className="text-ink-3 tabular-nums">
            / {book.pageCount} · {Math.round(progress * 100)} %
          </span>
        )}
      </div>
      {book.pageCount && (
        <div className="h-1 max-w-md overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-gallery"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function LoanNote({ book }: { book: Book }) {
  const { t } = useTranslation();
  const store = useStore();
  const format = useFormat();
  if (!book.loan) return null;
  const overdue = book.loan.due !== undefined && book.loan.due < todayIsoDate();
  return (
    <div
      className={cn(
        'mt-6 flex flex-wrap items-center gap-3 rounded-frame border px-4 py-3 text-sm animate-rise',
        overdue ? 'border-danger/40 bg-danger/5' : 'border-accent/30 bg-accent-soft',
      )}
    >
      <HandshakeIcon className={cn('size-4 shrink-0', overdue ? 'text-danger' : 'text-accent')} />
      <span className="min-w-0 flex-1 text-ink-2">
        {t('book.lentTo', { name: book.loan.name, date: format.date(book.loan.since) })}
        {book.loan.due && (
          <span className="block text-xs text-ink-3">
            {overdue
              ? t('book.overdue', { date: format.date(book.loan.due) })
              : t('book.due', { date: format.date(book.loan.due) })}
          </span>
        )}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await returnBook(store, book.id);
          toast.success(t('book.returned'));
        }}
      >
        {t('book.giveBack')}
      </Button>
    </div>
  );
}

function Readings({ book }: { book: Book }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <div className="mt-10">
      <p className="eyebrow mb-3 text-ink-3">{t('book.readings')}</p>
      <ol className="space-y-2 border-l border-line-strong pl-5 text-sm">
        {[...book.readings].reverse().map((r, i) => (
          <li
            // Readings have no id; their position is stable while the list is shown.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={i}
            className="relative text-ink-2 before:absolute before:top-1.5 before:-left-[1.4rem] before:size-2 before:rounded-full before:bg-accent"
          >
            {[
              r.startedOn ? t('book.started', { date: format.date(r.startedOn) }) : undefined,
              r.finishedOn ? t('book.finished', { date: format.date(r.finishedOn) }) : undefined,
              r.abandonedOn
                ? t('book.abandonedOn', { date: format.date(r.abandonedOn) })
                : undefined,
              !r.finishedOn && !r.abandonedOn ? t('book.ongoing') : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Quotes({ book }: { book: Book }) {
  const { t } = useTranslation();
  const store = useStore();
  const dialogs = useDialogs();
  return (
    <section className="mt-24">
      <SectionTitle
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => dialogs.open({ type: 'quote', bookId: book.id })}
          >
            <QuoteIcon /> {t('book.addQuote')}
          </Button>
        }
      >
        {t('book.quotes')}
      </SectionTitle>
      {book.quotes.length === 0 ? (
        <p className="caption text-lg text-ink-3">{t('book.noQuotes')}</p>
      ) : (
        <div className="grid gap-x-14 gap-y-12 md:grid-cols-2">
          {book.quotes.map((q) => (
            <figure key={q.id} className="group relative">
              <blockquote className="display text-[clamp(1.35rem,2.4vw,1.75rem)] leading-snug font-[340] text-ink italic before:mr-1 before:text-accent before:content-['»'] after:ml-1 after:text-accent after:content-['«']">
                {q.text}
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-3 text-xs text-ink-3">
                {q.page && <span className="eyebrow">{t('book.pageShort', { page: q.page })}</span>}
                {q.note && <span className="caption text-sm text-ink-2">{q.note}</span>}
                <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('book.editQuote')}
                    onClick={() => dialogs.open({ type: 'quote', bookId: book.id, quoteId: q.id })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('common.delete')}
                    onClick={async () => {
                      await removeQuote(store, book.id, q.id);
                      toast.success(t('book.quoteDeleted'));
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
