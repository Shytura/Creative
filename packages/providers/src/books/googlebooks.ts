import { compact, fetchJson, ProviderError, query } from '../http';
import type { BookSearchProvider, BookSearchResult, ProviderContext } from '../types';
import { firstIsbn, yearOf } from './common';

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    pageCount?: number;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    language?: string;
    canonicalVolumeLink?: string;
    infoLink?: string;
  };
}

export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleVolume[];
}

/** Thumbnails come as http with a page-curl effect; ask for https and a flat image. */
function coverOf(links: GoogleVolume['volumeInfo']['imageLinks']): string | undefined {
  const url = links?.thumbnail ?? links?.smallThumbnail;
  return url?.replace(/^http:/, 'https:').replace(/&edge=curl/, '');
}

export function mapGoogleBooks(response: GoogleBooksResponse): BookSearchResult[] {
  return (response.items ?? []).flatMap(({ id, volumeInfo: v }) =>
    v.title
      ? [
          compact({
            provider: 'googlebooks',
            externalId: id,
            title: v.title,
            subtitle: v.subtitle,
            authors: v.authors ?? [],
            isbn: firstIsbn(v.industryIdentifiers?.map((i) => i.identifier)),
            publisher: v.publisher,
            year: yearOf(v.publishedDate),
            pageCount: v.pageCount || undefined,
            language: v.language,
            description: v.description,
            coverUrl: coverOf(v.imageLinks),
            url: v.canonicalVolumeLink ?? v.infoLink,
          }),
        ]
      : [],
  );
}

async function volumes(q: string, ctx: ProviderContext) {
  const key = ctx.keys?.googlebooks;
  if (!key) throw new ProviderError('googlebooks', 'API key missing');
  const params = query({ q, key, maxResults: 20, printType: 'books' });
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;
  return mapGoogleBooks(await fetchJson<GoogleBooksResponse>('googlebooks', url, ctx));
}

/** Strong on descriptions and recent titles. Needs a key: anonymous requests get no quota. */
export const googleBooksProvider: BookSearchProvider = {
  id: 'googlebooks',
  name: 'Google Books',
  homepage: 'https://developers.google.com/books',
  requiresKey: {
    id: 'googlebooks',
    signupUrl: 'https://developers.google.com/books/docs/v1/using#APIKey',
  },
  search: (q, ctx) => volumes(q, ctx),
  async byIsbn(isbn, ctx) {
    return (await volumes(`isbn:${isbn}`, ctx)).find((b) => b.isbn === isbn);
  },
};
