import { normalizeIsbn } from '../lib/isbn';
import { createId, nowIso, todayIsoDate } from '../lib/misc';
import type { Book, BookDraft, BookStatus, Loan, Quote, Reading } from '../model/entities';
import type { MnemoStore } from '../repositories';
import { unlinkFromCollections } from './collections';
import { resolveCreatorIds } from './creators';

async function getBook(store: MnemoStore, id: string): Promise<Book> {
  const book = await store.books.get(id);
  if (!book) throw new Error(`Book ${id} not found`);
  return book;
}

/**
 * Creates or updates a book, normalising its ISBN and linking its authors as creators. On
 * updates, fields missing from the draft stay as they are.
 */
export async function saveBook(store: MnemoStore, draft: BookDraft, id?: string): Promise<Book> {
  const existing = id ? await store.books.get(id) : undefined;
  const authors = (draft.authors ?? existing?.authors ?? []).map((a) => a.trim()).filter(Boolean);
  const creatorIds =
    draft.creatorIds ??
    (await resolveCreatorIds(
      store,
      authors,
      existing && { names: existing.authors, creatorIds: existing.creatorIds },
    ));
  const next: BookDraft = { ...draft, authors, creatorIds };
  if ('isbn' in draft) next.isbn = draft.isbn ? normalizeIsbn(draft.isbn) : undefined;
  return id ? store.books.update(id, next) : store.books.create(next);
}

/** Finds a book already in the library by ISBN, in any notation. */
export async function findBookByIsbn(store: MnemoStore, isbn: string): Promise<Book | undefined> {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) return undefined;
  return (await store.books.list()).find((b) => b.isbn === normalized);
}

const isOpen = (r: Reading | undefined) => !!r && !r.finishedOn && !r.abandonedOn;

/** A book's reading history after it moves to `status` on `date`. */
export function nextReadings(
  book: Pick<Book, 'status' | 'readings'>,
  status: BookStatus,
  date: string,
): Reading[] {
  const readings = [...book.readings];
  const last = readings.at(-1);
  const open = isOpen(last);
  const close = (patch: Partial<Reading>) => {
    if (open) readings[readings.length - 1] = { ...last, ...patch };
    else readings.push(patch);
  };
  switch (status) {
    case 'reading':
      if (!open) readings.push({ startedOn: date });
      break;
    case 'read':
      close({ finishedOn: date });
      break;
    case 'abandoned':
      if (open) close({ abandonedOn: date });
      break;
    case 'unread':
      // A reading that was started by mistake disappears; finished ones stay as history.
      if (open) readings.pop();
      break;
  }
  return readings;
}

/**
 * Moves a book to a reading status and keeps its reading history in step: starting opens a
 * reading, finishing or abandoning closes it, so re-reads become separate entries.
 */
export async function setReadingStatus(
  store: MnemoStore,
  id: string,
  status: BookStatus,
  date = todayIsoDate(),
): Promise<Book> {
  const book = await getBook(store, id);
  if (book.status === status) return book;
  const startsOver = status === 'reading' && book.status !== 'unread';
  return store.books.update(id, {
    status,
    readings: nextReadings(book, status, date),
    currentPage: status === 'read' || startsOver ? undefined : book.currentPage,
  });
}

/** Adds a quote, or replaces the one with `quoteId`. */
export async function saveQuote(
  store: MnemoStore,
  bookId: string,
  quote: Pick<Quote, 'text'> & Partial<Pick<Quote, 'page' | 'note'>>,
  quoteId?: string,
): Promise<Book> {
  const book = await getBook(store, bookId);
  const existing = quoteId ? book.quotes.find((q) => q.id === quoteId) : undefined;
  const next: Quote = {
    id: existing?.id ?? createId(),
    createdAt: existing?.createdAt ?? nowIso(),
    text: quote.text,
    page: quote.page,
    note: quote.note,
  };
  return store.books.update(bookId, {
    quotes: existing
      ? book.quotes.map((q) => (q.id === existing.id ? next : q))
      : [...book.quotes, next],
  });
}

export async function removeQuote(store: MnemoStore, bookId: string, quoteId: string) {
  const book = await getBook(store, bookId);
  return store.books.update(bookId, { quotes: book.quotes.filter((q) => q.id !== quoteId) });
}

export async function lendBook(store: MnemoStore, id: string, loan: Loan): Promise<Book> {
  const book = await getBook(store, id);
  if (book.ownership !== 'owned') throw new Error('Only owned books can be lent');
  return store.books.update(id, { loan });
}

export async function returnBook(store: MnemoStore, id: string): Promise<Book> {
  return store.books.update(id, { loan: undefined });
}

export async function removeBook(store: MnemoStore, id: string): Promise<void> {
  await store.transaction(async () => {
    const book = await store.books.get(id);
    if (!book) return;
    await unlinkFromCollections(store, { kind: 'book', id });
    for (const mediaId of book.mediaIds) await store.media.delete(mediaId);
    await store.books.delete(id);
  });
}
