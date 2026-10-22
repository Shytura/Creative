import type { MediaVariant } from '@mnemo/core';
import { cn } from '@mnemo/ui';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { useMedia, useMediaUrl } from '../app/data';

interface MediaImageProps {
  mediaId: string | undefined;
  variant?: MediaVariant;
  alt: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  /** Reserve the image's aspect ratio before it loads (avoids layout shift in masonry). */
  keepRatio?: boolean;
  eager?: boolean;
}

export function MediaImage({
  mediaId,
  variant = 'thumb',
  alt,
  className,
  imgClassName,
  style,
  keepRatio,
  eager,
}: MediaImageProps) {
  const media = useMedia(mediaId);
  const url = useMediaUrl(mediaId, variant);
  const [loaded, setLoaded] = useState(false);
  const ratio =
    keepRatio && media?.width && media.height ? `${media.width} / ${media.height}` : undefined;

  return (
    <div
      className={cn('relative overflow-hidden bg-paper-2', className)}
      style={{ aspectRatio: ratio ?? (keepRatio ? '4 / 5' : undefined), ...style }}
    >
      {url && (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'size-full object-cover transition-[opacity,transform] duration-700 ease-gallery',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

/** Image from a URL with the same fade-in behaviour, for search results and previews. */
export function RemoteImage({
  src,
  alt,
  className,
  imgClassName,
  fallback,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Shown when there is no image or it fails to load (e.g. blocked by the host). */
  fallback?: ReactNode;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-paper-2', className)}>
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'size-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
      {(!src || failed) && fallback}
    </div>
  );
}
