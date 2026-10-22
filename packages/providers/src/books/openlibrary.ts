import { compact, fetchJson, query } from '../http';
import type { BookSearchProvider, BookSearchResult } from '../types';
import { cleanSubtitle, firstIsbn, languageFromMarc, yearOf } from './common';

interface OpenLibraryEdition {
  key: string;
  title?: string;
  subtitle?: string;
  cover_i?: number;
  language?: string[];
  publisher?: string[];
  publish_date?: string[];
  isbn?: string[];
}

interface OpenLibraryWork {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  /** The edition matching the query best, requested via `editions.*` fields. */
  editions?: { docs: OpenLibraryEdition[] };
}

export interface OpenLibrarySearchResponse {
  docs: OpenLibraryWork[];
}

interface OpenLibraryBook {
  key: string;
  title: string;
  subtitle?: string;
  authors?: Array<{ name: string }>;
  number_of_pages?: number;
  publishers?: Array<{ name: string }>;
  publish_date?: string;
  cover?: { large?: string; medium?: string };
}

export type OpenLibraryBooksResponse = Record<string, OpenLibraryBook>;

const FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'cover_i',
  'first_publish_year',
  'number_of_pages_median',
  'editions',
  ...['key', 'title', 'subtitle', 'cover_i', 'language', 'publisher', 'publish_date', 'isbn'].map(
    (f) => `editions.${f}`,
  ),
].join(',');

const cover = (id: number | undefined) =>
  id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : undefined;
const olid = (key: string) => key.split('/').pop() ?? key;

/** Search returns works; each comes with the edition that matches the query and locale best. */
export function mapOpenLibrarySearch(response: OpenLibrarySearchResponse): BookSearchResult[] {
  return response.docs.map((work) => {
    const edition = work.editions?.docs[0];
    return compact({
      provider: 'openlibrary',
      externalId: olid(edition?.key ?? work.key),
      title: edition?.title ?? work.title,
      subtitle: cleanSubtitle(edition?.subtitle ?? work.subtitle),
      authors: work.author_name ?? [],
      isbn: firstIsbn(edition?.isbn),
      publisher: edition?.publisher?.[0],
      year: yearOf(edition?.publish_date?.[0] ?? work.first_publish_year),
      pageCount: work.number_of_pages_median,
      language: languageFromMarc(edition?.language?.[0]),
      coverUrl: cover(edition?.cover_i ?? work.cover_i),
      url: `https://openlibrary.org${edition?.key ?? work.key}`,
    });
  });
}

export function mapOpenLibraryBook(isbn: string, book: OpenLibraryBook): BookSearchResult {
  return compact({
    provider: 'openlibrary',
    externalId: olid(book.key),
    title: book.title,
    subtitle: cleanSubtitle(book.subtitle),
    authors: (book.authors ?? []).map((a) => a.name),
    isbn,
    publisher: book.publishers?.[0]?.name,
    year: yearOf(book.publish_date),
    pageCount: book.number_of_pages,
    coverUrl: book.cover?.large ?? book.cover?.medium,
    url: `https://openlibrary.org${book.key}`,
  });
}

export const openLibraryProvider: BookSearchProvider = {
  id: 'openlibrary',
  name: 'Open Library',
  homepage: 'https://openlibrary.org/developers/api',
  async search(q, ctx) {
    const params = query({ q, lang: ctx.locale, limit: 20, fields: FIELDS });
    const url = `https://openlibrary.org/search.json?${params}`;
    const response = await fetchJson<OpenLibrarySearchResponse>('openlibrary', url, ctx, {
      minIntervalMs: 250,
    });
    return mapOpenLibrarySearch(response);
  },
  async byIsbn(isbn, ctx) {
    const params = query({ bibkeys: `ISBN:${isbn}`, jscmd: 'data', format: 'json' });
    const url = `https://openlibrary.org/api/books?${params}`;
    const response = await fetchJson<OpenLibraryBooksResponse>('openlibrary', url, ctx, {
      minIntervalMs: 250,
    });
    const book = response[`ISBN:${isbn}`];
    return book && mapOpenLibraryBook(isbn, book);
  },
};
