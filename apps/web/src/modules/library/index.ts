import type { BookOwnership, BookStatus } from '@mnemo/core';
import type { BookSearchResult } from '@mnemo/providers';
import { LibraryBigIcon } from 'lucide-react';
import { type AppModule, lazyDialog } from '../../app/modules';
import { BookItemCard } from '../../components/BookCard';

declare module '../../app/dialogs' {
  interface DialogRegistry {
    /** `prefill` comes from a catalogue search; without `bookId` a new book is created. */
    book: {
      bookId?: string;
      prefill?: Partial<BookSearchResult>;
      status?: BookStatus;
      ownership?: BookOwnership;
    };
    /** Catalogue search and ISBN lookup; `scan` opens the camera right away. */
    addBook: { ownership?: BookOwnership; scan?: boolean };
    quote: { bookId: string; quoteId?: string };
    loan: { bookId: string };
  }
}

/** Books: shelf, reading status, quotes and lending. */
export const libraryModule: AppModule = {
  id: 'library',
  nav: [
    {
      to: '/library',
      navKey: 'library',
      icon: LibraryBigIcon,
      order: 15,
      placement: 'main',
      mobile: true,
    },
  ],
  quickAdd: [
    {
      quickAddKey: 'book',
      icon: LibraryBigIcon,
      dialog: { type: 'addBook' },
      order: 15,
      group: 'record',
    },
  ],
  collectibles: {
    book: {
      Card: BookItemCard,
      href: (id) => `/book/${id}`,
    },
  },
  dialogs: {
    book: lazyDialog(
      () => import('../../features/library/BookForm'),
      (m) => m.BookFormDialog,
    ),
    addBook: lazyDialog(
      () => import('../../features/library/AddBook'),
      (m) => m.AddBookDialog,
    ),
    quote: lazyDialog(
      () => import('../../features/library/BookDialogs'),
      (m) => m.QuoteDialog,
    ),
    loan: lazyDialog(
      () => import('../../features/library/BookDialogs'),
      (m) => m.LoanDialog,
    ),
  },
};
