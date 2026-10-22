import type { Book } from '@mnemo/core';
import { cn } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import { BookmarkIcon, HandshakeIcon, HeartIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CollectibleCardProps } from '../app/collectibles';
import { BookCover } from './BookCover';

interface BookCardProps {
  book: Book;
  className?: string;
  style?: CSSProperties;
}

export function BookCard({ book, className, style }: BookCardProps) {
  const { t } = useTranslation();
  const progress =
    book.status === 'reading' && book.currentPage && book.pageCount
      ? Math.min(1, book.currentPage / book.pageCount)
      : undefined;

  return (
    <figure className={cn('group', className)} style={style}>
      <Link to="/book/$bookId" params={{ bookId: book.id }} className="block">
        <div className="relative">
          <BookCover
            book={book}
            className="shadow-frame transition-[box-shadow,translate] duration-500 ease-gallery group-hover:-translate-y-1 group-hover:shadow-float"
            style={{ viewTransitionName: `book-${book.id}` }}
          />
          <div className="absolute top-2 right-2 flex gap-1.5">
            {book.ownership === 'wishlist' && (
              <Badge label={t('book.ownership.wishlist')}>
                <BookmarkIcon className="size-3.5" />
              </Badge>
            )}
            {book.loan && (
              <Badge label={t('book.lentToast', { name: book.loan.name })}>
                <HandshakeIcon className="size-3.5" />
              </Badge>
            )}
            {book.favorite && (
              <Badge label={t('book.favorite')} accent>
                <HeartIcon className="size-3.5 fill-current" />
              </Badge>
            )}
          </div>
          {progress !== undefined && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
              <span
                className="block h-full bg-accent"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          )}
        </div>
        <figcaption className="mt-3 space-y-0.5">
          <p className="caption line-clamp-2 text-base leading-snug text-ink transition-colors group-hover:text-accent">
            {book.title}
          </p>
          <p className="line-clamp-1 text-xs text-ink-2">{book.authors.join(', ')}</p>
        </figcaption>
      </Link>
    </figure>
  );
}

export function BookItemCard({ item, ...rest }: CollectibleCardProps<'book'>) {
  return <BookCard book={item} {...rest} />;
}

function Badge({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      title={label}
      className={cn(
        'grid size-7 place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur',
        accent ? 'text-accent' : 'text-ink',
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}
