import { type Book, hashString } from '@mnemo/core';
import { cn } from '@mnemo/ui';
import type { CSSProperties } from 'react';
import { MediaImage, RemoteImage } from './MediaImage';

/** Cloth colours of old library bindings; a book without cover gets one by its title. */
const BINDINGS = [
  { cloth: '#2f4a3a', ink: '#e9dfc4' },
  { cloth: '#6b2a2a', ink: '#f0e2c8' },
  { cloth: '#26344f', ink: '#e6dcc2' },
  { cloth: '#9a6b2f', ink: '#fbf3df' },
  { cloth: '#4a4740', ink: '#ece4d0' },
  { cloth: '#5c3b55', ink: '#f2e6d6' },
  { cloth: '#c9b994', ink: '#2b261f' },
] as const;

/** Light falling on a spine: a dark fold, a highlight, then the board. */
const SPINE =
  'linear-gradient(90deg, rgb(0 0 0 / 0.28) 0%, rgb(255 255 255 / 0.16) 2.5%, rgb(0 0 0 / 0.08) 5%, transparent 9%)';

interface BookCoverProps {
  book: Pick<Book, 'id' | 'title' | 'authors' | 'mediaIds'>;
  /** A catalogue cover for books that are not stored yet. */
  src?: string;
  variant?: 'thumb' | 'full';
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}

export function BookCover({ book, src, variant, className, style, eager }: BookCoverProps) {
  const mediaId = book.mediaIds[0];
  const fallback = <BindingCover title={book.title} author={book.authors[0]} />;
  return (
    <div
      className={cn('relative aspect-[2/3] overflow-hidden rounded-[2px_4px_4px_2px]', className)}
      style={style}
    >
      {mediaId ? (
        <MediaImage
          mediaId={mediaId}
          variant={variant}
          alt={book.title}
          eager={eager}
          className="size-full"
        />
      ) : src ? (
        <RemoteImage src={src} alt={book.title} className="size-full" fallback={fallback} />
      ) : (
        fallback
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: SPINE }}
      />
    </div>
  );
}

/** A typographic binding: title and author stamped on cloth, framed by a thin rule. */
function BindingCover({ title, author }: { title: string; author: string | undefined }) {
  const binding = BINDINGS[hashString(title) % BINDINGS.length]!;
  return (
    <div
      className="@container flex size-full flex-col items-center justify-between px-[12%] py-[14%] text-center"
      style={{ background: binding.cloth, color: binding.ink }}
    >
      <span className="h-px w-1/3 bg-current opacity-50" />
      <span className="display line-clamp-5 text-[clamp(0.35rem,11cqi,2rem)] leading-tight font-[420] break-words hyphens-auto italic">
        {title}
      </span>
      <span className="eyebrow line-clamp-2 text-[clamp(0.2rem,4.5cqi,0.75rem)] opacity-80">
        {author ?? ''}
      </span>
    </div>
  );
}
