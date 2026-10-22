import { epochOf, epochs, type LibraryInsight, parseYear } from '@mnemo/core';
import { EmptyState, PageHeader, SectionTitle, Stat } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtworks, useInsights } from '../../app/data';
import { Flag } from '../../components/bits';
import { useFormat } from '../../lib/format';

export function InsightsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const insights = useInsights();
  const artworks = useArtworks();

  const epochCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of artworks ?? []) {
      if (a.status !== 'seen') continue;
      const e = epochOf(parseYear(a.year));
      if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
    }
    return epochs.map((e) => ({
      label: t(`epochs.${e.id}`),
      value: counts.get(e.id) ?? 0,
      key: e.id,
    }));
  }, [artworks, t]);

  if (!insights) return null;
  const { totals } = insights;

  if (totals.visits === 0 && totals.artworks === 0 && insights.library.books === 0) {
    return (
      <>
        <PageHeader eyebrow={t('insights.eyebrow')} title={t('insights.title')} />
        <EmptyState title={t('insights.emptyTitle')} description={t('insights.emptyText')} />
      </>
    );
  }

  const since = insights.firstVisit
    ? format.date(insights.firstVisit.date, 'monthYear')
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow={t('insights.eyebrow')}
        title={t('insights.title')}
        lede={since ? t('insights.ledeSince', { since }) : t('insights.lede')}
      />

      <section className="grid grid-cols-2 gap-x-6 gap-y-12 border-b border-line py-14 md:grid-cols-3 lg:grid-cols-6">
        <Stat value={totals.countries} label={t('stats.countries', { count: totals.countries })} />
        <Stat value={totals.places} label={t('stats.cities', { count: totals.places })} />
        <Stat value={totals.venues} label={t('stats.venues', { count: totals.venues })} />
        <Stat value={totals.visits} label={t('stats.visits', { count: totals.visits })} />
        <Stat value={totals.artworks} label={t('stats.artworks', { count: totals.artworks })} />
        <Stat value={totals.wishlist} label={t('stats.wishlist', { count: totals.wishlist })} />
      </section>

      {insights.spectrum.length > 0 && (
        <section className="mt-20">
          <SectionTitle>{t('insights.spectrum')}</SectionTitle>
          <p className="caption -mt-2 mb-6 text-lg text-ink-3">{t('insights.spectrumText')}</p>
          <div
            className="flex h-24 overflow-hidden rounded-frame shadow-frame"
            role="img"
            aria-label={t('insights.spectrum')}
          >
            {insights.spectrum.map((c, i) => (
              <Link
                // biome-ignore lint/suspicious/noArrayIndexKey: colours may repeat
                key={`${c}-${i}`}
                to="/collection"
                search={{ color: c }}
                className="min-w-0.5 flex-1 transition-[flex-grow] duration-500 ease-gallery hover:flex-[4]"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-2">
        {insights.visitsByYear.length > 0 && (
          <section>
            <SectionTitle>{t('insights.visitsPerYear')}</SectionTitle>
            <ColumnChart
              data={insights.visitsByYear.map((y) => ({
                key: String(y.year),
                label: String(y.year),
                value: y.count,
              }))}
              caption={t('insights.visitsPerYear')}
              valueLabel={(n) => t('stats.visits', { count: n })}
            />
          </section>
        )}
        {totals.artworks > 0 && (
          <section>
            <SectionTitle>{t('insights.epochs')}</SectionTitle>
            <ColumnChart
              data={epochCounts}
              caption={t('insights.epochs')}
              valueLabel={(n) => t('stats.artworks', { count: n })}
              compactLabels
            />
          </section>
        )}
      </div>

      {insights.library.books > 0 && <LibrarySection library={insights.library} />}

      <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-3">
        <section>
          <SectionTitle>{t('insights.artists')}</SectionTitle>
          <RankList
            items={insights.topCreators.map((c) => ({
              key: c.creator.id,
              label: c.creator.name,
              value: c.count,
              creatorId: c.creator.id,
            }))}
          />
        </section>
        <section>
          <SectionTitle>{t('insights.venues')}</SectionTitle>
          <RankList
            items={insights.topVenues.map((v) => ({
              key: v.venue.id,
              label: v.venue.name,
              value: v.count,
              venueId: v.venue.id,
            }))}
          />
        </section>
        <section>
          <SectionTitle>{t('insights.countries')}</SectionTitle>
          <ul className="space-y-3">
            {insights.countries.map((c) => (
              <li key={c.code ?? c.name} className="flex items-center gap-3">
                <Flag code={c.code} className="text-2xl" />
                <span className="flex-1 text-sm">{format.country(c.code, c.name)}</span>
                <span className="text-xs text-ink-3 tabular-nums">
                  {t('stats.cities', { count: c.places.length })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

interface Datum {
  key: string;
  label: string;
  value: number;
}

function LibrarySection({ library }: { library: LibraryInsight }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <section className="mt-20">
      <SectionTitle>{t('insights.library')}</SectionTitle>
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-6 md:grid-cols-4">
        <Stat value={library.books} label={t('stats.books', { count: library.books })} />
        <Stat value={library.read} label={t('stats.booksRead', { count: library.read })} />
        <Stat
          value={format.number(library.pagesRead)}
          label={t('stats.pages', { count: library.pagesRead })}
        />
        <Stat value={library.lent.length} label={t('stats.lent', { count: library.lent.length })} />
      </div>
      {library.readByYear.length > 0 && (
        <div className="mt-12 max-w-3xl">
          <p className="eyebrow mb-4 text-ink-3">{t('insights.readPerYear')}</p>
          <ColumnChart
            data={library.readByYear.map((y) => ({
              key: String(y.year),
              label: String(y.year),
              value: y.count,
            }))}
            caption={t('insights.readPerYear')}
            valueLabel={(n) => t('stats.booksRead', { count: n })}
          />
        </div>
      )}
    </section>
  );
}

/** Single-series column chart: thin accent bars, rounded data end, value on hover. */
function ColumnChart({
  data,
  caption,
  valueLabel,
  compactLabels,
}: {
  data: Datum[];
  caption: string;
  valueLabel: (n: number) => string;
  compactLabels?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    // Clip sideways only: hover labels at the edges must not widen the page.
    <figure className="overflow-x-clip">
      <div
        className="relative flex h-56 items-end gap-0.5 border-b border-line-strong"
        aria-hidden="true"
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <span
            key={f}
            className="pointer-events-none absolute inset-x-0 border-t border-line"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        {data.map((d) => (
          <div
            key={d.key}
            className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
          >
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
            />
            <span className="pointer-events-none absolute bottom-full mb-2 rounded-[2px] bg-ink px-2 py-1 text-[0.6875rem] whitespace-nowrap text-paper opacity-0 shadow-frame transition-opacity group-hover:opacity-100">
              {d.label}: {valueLabel(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-0.5" aria-hidden="true">
        {data.map((d) => (
          <span
            key={d.key}
            className={`min-w-0 flex-1 truncate text-center text-ink-3 tabular-nums ${compactLabels ? 'text-[0.625rem]' : 'text-xs'}`}
            title={d.label}
          >
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

type RankItem = {
  key: string;
  label: string;
  value: number;
  creatorId?: string;
  venueId?: string;
};

function RankList({ items }: { items: RankItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-4">
      {items.map((item, index) => {
        const label = <span className="truncate">{item.label}</span>;
        return (
          <li key={item.key}>
            <div className="flex items-baseline gap-3 text-sm">
              <span className="w-5 text-xs text-ink-3 tabular-nums">{index + 1}</span>
              {item.creatorId ? (
                <Link
                  to="/creator/$creatorId"
                  params={{ creatorId: item.creatorId }}
                  className="min-w-0 flex-1 truncate hover:text-accent"
                >
                  {label}
                </Link>
              ) : item.venueId ? (
                <Link
                  to="/venue/$venueId"
                  params={{ venueId: item.venueId }}
                  className="min-w-0 flex-1 truncate hover:text-accent"
                >
                  {label}
                </Link>
              ) : (
                <span className="min-w-0 flex-1">{label}</span>
              )}
              <span className="text-xs text-ink-3 tabular-nums">{item.value}</span>
            </div>
            <div className="mt-1.5 ml-8 h-0.5 bg-line">
              <div
                className="h-full rounded-r-full bg-accent"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
