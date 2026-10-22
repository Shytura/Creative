import { groupBy } from '@mnemo/core';
import { Button, EmptyState, PageHeader, Rating } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import { PencilIcon, StampIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtworks, useLookups, useVisits } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { Flag, KindIcon } from '../../components/bits';
import { MediaImage } from '../../components/MediaImage';
import { useFormat } from '../../lib/format';

export function JournalPage() {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const format = useFormat();
  const visits = useVisits();
  const artworks = useArtworks();
  const { venues, placeOfVenue } = useLookups();

  const years = useMemo(() => [...groupBy(visits ?? [], (v) => v.date.slice(0, 4))], [visits]);
  const artworksByVisit = useMemo(
    () =>
      groupBy(
        (artworks ?? []).filter((a) => a.visitId),
        (a) => a.visitId ?? '',
      ),
    [artworks],
  );

  return (
    <>
      <PageHeader
        eyebrow={t('journal.eyebrow')}
        title={t('journal.title')}
        lede={t('journal.lede')}
        actions={
          <Button onClick={() => dialogs.open({ type: 'visit' })}>
            <StampIcon /> {t('journal.add')}
          </Button>
        }
      />

      {visits && visits.length === 0 && (
        <EmptyState
          title={t('journal.emptyTitle')}
          description={t('journal.emptyText')}
          action={
            <Button onClick={() => dialogs.open({ type: 'visit' })}>
              <StampIcon /> {t('journal.add')}
            </Button>
          }
        />
      )}

      <div className="mt-16 space-y-24">
        {years.map(([year, yearVisits]) => (
          <section key={year} className="grid gap-8 lg:grid-cols-[12rem_1fr] lg:gap-16">
            <header className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="display text-7xl font-[300] text-ink-3/70 tabular-nums lg:text-8xl">
                {year}
              </h2>
              <p className="eyebrow mt-3 text-ink-3">
                {t('journal.yearSummary', {
                  count: yearVisits.length,
                  places: new Set(yearVisits.map((v) => placeOfVenue(v.venueId)?.id)).size,
                })}
              </p>
            </header>
            <ol className="relative space-y-14 border-l border-line pl-8 md:pl-12">
              {yearVisits.map((visit) => {
                const venue = venues.get(visit.venueId);
                const place = placeOfVenue(visit.venueId);
                const seen = artworksByVisit.get(visit.id) ?? [];
                const images = [
                  ...visit.mediaIds.map((id) => ({ id, link: undefined })),
                  ...seen.flatMap((a) =>
                    a.mediaIds[0] ? [{ id: a.mediaIds[0], link: a.id }] : [],
                  ),
                ];
                return (
                  <li key={visit.id} className="group relative animate-rise">
                    <span className="absolute top-2 -left-[calc(2rem+5px)] size-2.5 rounded-full border-2 border-paper bg-accent ring-1 ring-accent md:-left-[calc(3rem+5px)]" />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="eyebrow text-accent">
                        {format.date(visit.date, 'dayMonth')}
                        {visit.endDate && ` – ${format.date(visit.endDate, 'dayMonth')}`}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label={t('common.edit')}
                        onClick={() => dialogs.open({ type: 'visit', visitId: visit.id })}
                      >
                        <PencilIcon />
                      </Button>
                    </div>
                    {venue && (
                      <Link
                        to="/venue/$venueId"
                        params={{ venueId: venue.id }}
                        className="mt-2 block"
                      >
                        <h3 className="display text-3xl font-[400] transition-colors hover:text-accent md:text-4xl">
                          {venue.name}
                        </h3>
                      </Link>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
                      {venue && (
                        <span className="inline-flex items-center gap-1.5">
                          <KindIcon kind={venue.kind} className="size-3.5" />{' '}
                          {t(`venue.kinds.${venue.kind}`)}
                        </span>
                      )}
                      {place && (
                        <Link
                          to="/place/$placeId"
                          params={{ placeId: place.id }}
                          className="hover:text-accent"
                        >
                          <Flag code={place.countryCode} /> {place.name}
                        </Link>
                      )}
                      {visit.rating && <Rating value={visit.rating} label={t('visit.rating')} />}
                    </p>
                    {visit.notes && (
                      <p className="mt-4 max-w-2xl font-display text-lg leading-relaxed whitespace-pre-line text-ink-2">
                        {visit.notes}
                      </p>
                    )}
                    {visit.companions.length > 0 && (
                      <p className="mt-3 text-xs text-ink-3">
                        {t('visit.with', { names: visit.companions.join(', ') })}
                      </p>
                    )}
                    {images.length > 0 && (
                      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                        {images.map((img) =>
                          img.link ? (
                            <Link
                              key={img.id}
                              to="/artwork/$artworkId"
                              params={{ artworkId: img.link }}
                              className="shrink-0"
                            >
                              <MediaImage
                                mediaId={img.id}
                                alt=""
                                className="h-36 w-28 shadow-soft transition-shadow hover:shadow-frame md:h-44 md:w-36"
                              />
                            </Link>
                          ) : (
                            <MediaImage
                              key={img.id}
                              mediaId={img.id}
                              alt=""
                              className="h-36 w-28 shrink-0 shadow-soft md:h-44 md:w-36"
                            />
                          ),
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
