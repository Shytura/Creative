import type { Artwork } from '@mnemo/core';
import { cn } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import { BookmarkIcon, HeartIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useLookups } from '../app/data';
import { MediaImage } from './MediaImage';

interface ArtworkCardProps {
  artwork: Artwork;
  className?: string;
  /** Fixed-ratio crop instead of the natural image ratio. */
  crop?: boolean;
  showVenue?: boolean;
  style?: CSSProperties;
}

export function ArtworkCard({
  artwork,
  className,
  crop,
  showVenue = true,
  style,
}: ArtworkCardProps) {
  const { t } = useTranslation();
  const { venues, placeOfVenue } = useLookups();
  const venue = artwork.venueId ? venues.get(artwork.venueId) : undefined;
  const place = placeOfVenue(artwork.venueId);
  const mediaId = artwork.mediaIds[0];

  return (
    <figure className={cn('group', className)} style={style}>
      <Link to="/artwork/$artworkId" params={{ artworkId: artwork.id }} className="block">
        <div className="relative">
          {mediaId ? (
            <MediaImage
              mediaId={mediaId}
              alt={artwork.title}
              keepRatio={!crop}
              className={cn(
                'shadow-frame transition-shadow duration-500 group-hover:shadow-float',
                crop && 'aspect-[4/5]',
              )}
              imgClassName="group-hover:scale-[1.025]"
              style={{ viewTransitionName: `artwork-${artwork.id}` }}
            />
          ) : (
            <Placeholder artwork={artwork} crop={crop} />
          )}
          <div className="absolute top-2.5 right-2.5 flex gap-1.5">
            {artwork.status === 'wishlist' && (
              <span className="flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[0.625rem] font-semibold tracking-wide text-ink uppercase shadow-soft backdrop-blur">
                <BookmarkIcon className="size-3" /> {t('artwork.status.wishlist')}
              </span>
            )}
            {artwork.favorite && (
              <span className="grid size-7 place-items-center rounded-full bg-surface/90 text-accent shadow-soft backdrop-blur">
                <HeartIcon className="size-3.5 fill-current" />
                <span className="sr-only">{t('artwork.favorite')}</span>
              </span>
            )}
          </div>
        </div>
        <figcaption className="mt-3.5 space-y-1">
          <p className="caption text-[1.0625rem] leading-snug text-ink transition-colors group-hover:text-accent">
            {artwork.title}
          </p>
          <p className="text-xs text-ink-2">
            {[artwork.artist, artwork.year].filter(Boolean).join(', ')}
          </p>
          {showVenue && venue && (
            <p className="eyebrow pt-0.5 text-[0.625rem] text-ink-3">
              {venue.name}
              {place ? ` · ${place.name}` : ''}
            </p>
          )}
        </figcaption>
      </Link>
    </figure>
  );
}

/** A typographic stand-in for artworks without image. */
function Placeholder({ artwork, crop }: { artwork: Artwork; crop?: boolean | undefined }) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between border border-line bg-surface p-5 shadow-frame transition-shadow duration-500 group-hover:shadow-float',
        crop ? 'aspect-[4/5]' : 'aspect-[4/3]',
      )}
    >
      <span className="eyebrow text-gold">{artwork.year ?? '—'}</span>
      <span className="display line-clamp-4 text-3xl font-[340] italic text-ink-2">
        {artwork.title}
      </span>
    </div>
  );
}
