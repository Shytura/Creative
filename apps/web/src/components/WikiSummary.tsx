import { wikipediaSummary, wikipediaSummaryFromTag } from '@mnemo/providers';
import { cn, Skeleton } from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProviderContext } from '../app/data';
import { RemoteImage } from './MediaImage';

interface WikiSummaryProps {
  /** OSM-style `lang:Title`; takes precedence over `title`. */
  tag?: string | undefined;
  /** Article title in the UI language. */
  title?: string | undefined;
  className?: string;
  layout?: 'aside' | 'inline';
}

export function useWikiSummary(tag?: string, title?: string) {
  const ctx = useProviderContext();
  return useQuery({
    queryKey: ['wikipedia', tag ?? `${ctx.locale}:${title}`],
    queryFn: ({ signal }) =>
      tag
        ? wikipediaSummaryFromTag(tag, { ...ctx, signal })
        : wikipediaSummary(ctx.locale, title ?? '', { ...ctx, signal }),
    enabled: Boolean(tag || title),
    staleTime: 7 * 24 * 60 * 60_000,
    select: (s) => s ?? null,
  });
}

export function WikiSummary({ tag, title, className, layout = 'aside' }: WikiSummaryProps) {
  const { t } = useTranslation();
  const summary = useWikiSummary(tag, title);

  if (summary.isPending && (tag || title)) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  const data = summary.data;
  if (!data) return null;

  return (
    <aside
      className={cn(
        'flex gap-5',
        layout === 'inline' ? 'flex-col sm:flex-row' : 'flex-col',
        className,
      )}
    >
      {data.imageUrl && (
        <RemoteImage
          src={data.imageUrl}
          alt={data.title}
          className={cn(
            'shrink-0 shadow-frame',
            layout === 'inline' ? 'aspect-[4/3] w-full sm:w-56' : 'aspect-[16/10] w-full',
          )}
        />
      )}
      <div>
        <p className="font-display text-[1.0625rem] leading-relaxed text-ink-2">{data.extract}</p>
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          className="eyebrow mt-3 inline-flex items-center gap-1 text-ink-3 transition-colors hover:text-accent"
        >
          Wikipedia <ArrowUpRightIcon className="size-3" />
          <span className="sr-only">{t('common.opensInNewTab')}</span>
        </a>
      </div>
    </aside>
  );
}
