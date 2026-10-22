import { type Book, bookSorts, facet, filterBooks, itemIdsOf } from '@mnemo/core';
import {
  Button,
  Chip,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Segmented,
  Select,
} from '@mnemo/ui';
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  HandshakeIcon,
  HeartIcon,
  LayoutGridIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBooks, useCollections } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { BookCard } from '../../components/BookCard';
import { BookCover } from '../../components/BookCover';
import { useFormat } from '../../lib/format';
import type { LibrarySearch } from './search';

const routeApi = getRouteApi('/library');

export function LibraryPage() {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const books = useBooks();
  const collections = useCollections();

  const setSearch = (patch: Partial<LibrarySearch>) =>
    void navigate({
      search: (prev) =>
        Object.fromEntries(
          Object.entries({ ...prev, ...patch }).filter(([, v]) => v !== undefined && v !== ''),
        ),
      replace: true,
    });

  const results = useMemo(
    () =>
      filterBooks(
        books ?? [],
        {
          query: search.q,
          status: search.status,
          ownership: search.own,
          lent: search.lent,
          favorite: search.fav,
          author: search.author,
          tag: search.tag,
          collectionId: search.collection,
          sort: search.sort,
        },
        collections ?? [],
      ),
    [books, collections, search],
  );

  const reading = useMemo(() => (books ?? []).filter((b) => b.status === 'reading'), [books]);
  const lists = (collections ?? []).filter(
    (c) => itemIdsOf(c, 'book').length > 0 || c.id === search.collection,
  );
  const activeCollection = collections?.find((c) => c.id === search.collection);
  const hasFilters = Boolean(
    search.q ||
      search.status ||
      search.own ||
      search.lent ||
      search.fav ||
      search.author ||
      search.tag,
  );

  if (books && books.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={t('library.eyebrowPage')}
          title={t('library.title')}
          lede={t('library.lede')}
        />
        <EmptyState
          title={t('library.emptyTitle')}
          description={t('library.emptyText')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => dialogs.open({ type: 'addBook' })}>
                <PlusIcon /> {t('library.addFirst')}
              </Button>
              <Button variant="outline" onClick={() => dialogs.open({ type: 'book' })}>
                {t('book.add.manual')}
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('library.eyebrowPage')}
        title={activeCollection?.name ?? t('library.title')}
        lede={activeCollection?.description || t('library.lede')}
        actions={
          <>
            {activeCollection && (
              <Button
                variant="outline"
                onClick={() =>
                  dialogs.open({ type: 'collection', collectionId: activeCollection.id })
                }
              >
                <PencilIcon /> {t('common.edit')}
              </Button>
            )}
            <Button onClick={() => dialogs.open({ type: 'addBook' })}>
              <PlusIcon /> {t('library.add')}
            </Button>
          </>
        }
      />

      {reading.length > 0 && !activeCollection && !hasFilters && <ReadingNow books={reading} />}

      {lists.length > 0 && (
        <div className="-mx-1 mt-8 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={!search.collection} onClick={() => setSearch({ collection: undefined })}>
            {t('library.all')}
          </Chip>
          {lists.map((c) => (
            <Chip
              key={c.id}
              active={search.collection === c.id}
              onClick={() => setSearch({ collection: c.id })}
            >
              {c.name} <span className="opacity-50">{itemIdsOf(c, 'book').length}</span>
            </Chip>
          ))}
        </div>
      )}

      <Toolbar search={search} setSearch={setSearch} books={books ?? []} />

      <div className="mt-6 mb-8 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>{t('library.count', { count: results.length })}</span>
        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            className="ml-2 text-ink-3"
            onClick={() =>
              void navigate({
                search: { collection: search.collection, view: search.view, sort: search.sort },
              })
            }
          >
            {t('library.reset')}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        books && (
          <EmptyState title={t('library.noMatchTitle')} description={t('library.noMatchText')} />
        )
      ) : search.view === 'list' ? (
        <BookTable books={results} />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((b, i) => (
            <BookCard
              key={b.id}
              book={b}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 15) * 35}ms` }}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** The books on the nightstand, with how far along they are. */
function ReadingNow({ books }: { books: Book[] }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('library.reading')} className="mt-10">
      <p className="eyebrow mb-4 text-accent">{t('library.reading')}</p>
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

function Toolbar({
  search,
  setSearch,
  books,
}: {
  search: LibrarySearch;
  setSearch: (patch: Partial<LibrarySearch>) => void;
  books: Book[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(search.q ?? '');
  const authors = useMemo(() => facet(books.flatMap((b) => b.authors)), [books]);
  const tags = useMemo(() => facet(books.flatMap((b) => b.tags)), [books]);
  const advancedCount = [search.author, search.tag, search.own].filter(Boolean).length;

  return (
    <div className="mt-6 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center">
      <form
        className="relative lg:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ q: query.trim() || undefined });
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          type="search"
          value={query}
          placeholder={t('library.searchPlaceholder')}
          aria-label={t('library.searchPlaceholder')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === '') setSearch({ q: undefined });
          }}
          onBlur={() => setSearch({ q: query.trim() || undefined })}
          className="rounded-full pl-9"
        />
      </form>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Segmented
          aria-label={t('book.fields.status')}
          value={search.status ?? 'all'}
          onChange={(v) => setSearch({ status: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: t('library.filterAll') },
            { value: 'unread', label: t('book.status.unread') },
            { value: 'reading', label: t('book.status.reading') },
            { value: 'read', label: t('book.status.read') },
          ]}
        />
        <Chip
          active={search.fav}
          onClick={() => setSearch({ fav: search.fav ? undefined : true })}
          leading={<HeartIcon className="size-3.5" />}
        >
          {t('library.favorites')}
        </Chip>
        <Chip
          active={search.lent}
          onClick={() => setSearch({ lent: search.lent ? undefined : true })}
          leading={<HandshakeIcon className="size-3.5" />}
        >
          {t('library.lent')}
        </Chip>
        <Popover>
          <PopoverTrigger asChild>
            <Chip
              active={advancedCount > 0}
              leading={<SlidersHorizontalIcon className="size-3.5" />}
            >
              {t('library.filters')}
              {advancedCount > 0 && <span className="opacity-60">{advancedCount}</span>}
            </Chip>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="library-own">{t('book.fields.ownership')}</Label>
              <Select
                id="library-own"
                value={search.own ?? ''}
                onChange={(e) =>
                  setSearch({ own: (e.target.value || undefined) as LibrarySearch['own'] })
                }
              >
                <option value="">{t('library.filterAll')}</option>
                <option value="owned">{t('book.ownership.owned')}</option>
                <option value="wishlist">{t('book.ownership.wishlist')}</option>
                <option value="borrowed">{t('book.ownership.borrowed')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="library-author">{t('library.author')}</Label>
              <Select
                id="library-author"
                value={search.author ?? ''}
                onChange={(e) => setSearch({ author: e.target.value || undefined })}
              >
                <option value="">{t('library.anyAuthor')}</option>
                {authors.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.value} ({a.count})
                  </option>
                ))}
              </Select>
            </div>
            {tags.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="library-tag">{t('library.tag')}</Label>
                <Select
                  id="library-tag"
                  value={search.tag ?? ''}
                  onChange={(e) => setSearch({ tag: e.target.value || undefined })}
                >
                  <option value="">{t('library.anyTag')}</option>
                  {tags.map((tag) => (
                    <option key={tag.value} value={tag.value}>
                      #{tag.value} ({tag.count})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2 lg:ml-auto">
        <Select
          aria-label={t('library.sort')}
          value={search.sort ?? 'added'}
          onChange={(e) =>
            setSearch({
              sort:
                e.target.value === 'added' ? undefined : (e.target.value as LibrarySearch['sort']),
            })
          }
          className="h-9 w-auto rounded-full text-xs"
          disabled={Boolean(search.collection)}
        >
          {bookSorts.map((s) => (
            <option key={s} value={s}>
              {t(`library.sorts.${s}`)}
            </option>
          ))}
        </Select>
        <Segmented
          aria-label={t('library.views.shelf')}
          value={search.view ?? 'shelf'}
          onChange={(v) => setSearch({ view: v === 'shelf' ? undefined : v })}
          options={[
            {
              value: 'shelf',
              label: (
                <>
                  <LayoutGridIcon className="size-4" />
                  <span className="sr-only">{t('library.views.shelf')}</span>
                </>
              ),
            },
            {
              value: 'list',
              label: (
                <>
                  <ListIcon className="size-4" />
                  <span className="sr-only">{t('library.views.list')}</span>
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function BookTable({ books }: { books: Book[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="eyebrow border-b border-line-strong text-ink-3">
            <th className="w-12 py-3 font-semibold" />
            <th className="py-3 font-semibold">{t('book.fields.title')}</th>
            <th className="py-3 font-semibold">{t('book.fields.authors')}</th>
            <th className="py-3 font-semibold">{t('book.fields.year')}</th>
            <th className="py-3 font-semibold">{t('book.fields.status')}</th>
            <th className="py-3 text-right font-semibold">{t('book.fields.added')}</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b.id} className="group border-b border-line transition-colors hover:bg-ink/3">
              <td className="py-2 pr-3">
                <BookCover book={b} className="w-9 shadow-soft" />
              </td>
              <td className="py-2 pr-4">
                <Link
                  to="/book/$bookId"
                  params={{ bookId: b.id }}
                  className="caption text-base group-hover:text-accent"
                >
                  {b.title}
                </Link>
                {b.favorite && (
                  <HeartIcon className="ml-2 inline size-3.5 fill-accent text-accent" />
                )}
              </td>
              <td className="py-2 pr-4 text-ink-2">{b.authors.join(', ')}</td>
              <td className="py-2 pr-4 text-ink-2 tabular-nums">{b.year}</td>
              <td className="py-2 pr-4 text-ink-2">
                {b.ownership === 'wishlist'
                  ? t('book.ownership.wishlist')
                  : t(`book.status.${b.status}`)}
              </td>
              <td className="py-2 text-right text-ink-3 tabular-nums">
                {format.date(b.createdAt, 'medium')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
