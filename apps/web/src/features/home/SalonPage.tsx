import { todayIsoDate } from '@mnemo/core';
import { Button, cn, SectionTitle, Skeleton, Stat } from '@mnemo/ui';
import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CompassIcon,
  ImagesIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useArtworks,
  useBooks,
  useInsights,
  useLookups,
  useProviderContext,
  useTrips,
  useVisits,
} from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useArtworkOfTheDay } from '../../app/shell/Appearance';
import { useStore } from '../../app/store';
import { ArtworkCard } from '../../components/ArtworkCard';
import { Flag } from '../../components/bits';
import { MediaImage } from '../../components/MediaImage';
import { ReadingNow } from '../../components/ReadingNow';
import { useWikiSummary } from '../../components/WikiSummary';
import { seedDemo } from '../../lib/demo';
import { useFormat } from '../../lib/format';

function greetingKey(hour: number) {
  if (hour < 11) return 'salon.greeting.morning';
  if (hour < 18) return 'salon.greeting.day';
  return 'salon.greeting.evening';
}

export function SalonPage() {
  const artworks = useArtworks();
  const visits = useVisits();
  const books = useBooks();

  if (!artworks || !visits || !books) {
    return (
      <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
        <Skeleton className="aspect-[4/3]" />
        <div className="space-y-4 pt-12">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }
  if (artworks.length === 0 && visits.length === 0 && books.length === 0) return <Welcome />;
  return <Salon />;
}

function Salon() {
  const { t } = useTranslation();
  const format = useFormat();
  const daily = useArtworkOfTheDay();
  const insights = useInsights();
  const artworks = useArtworks() ?? [];
  const visits = useVisits() ?? [];
  const trips = useTrips() ?? [];
  const { venues, placeOfVenue } = useLookups();

  const dailyVenue = daily?.venueId ? venues.get(daily.venueId) : undefined;
  const dailyPlace = placeOfVenue(daily?.venueId);
  const recent = artworks.slice(0, 6);
  const nextTrip =
    trips
      .filter((t) => t.status === 'planned')
      .sort((a, b) => (a.startDate ?? '9').localeCompare(b.startDate ?? '9'))[0] ??
    trips.find((t) => t.status === 'idea');

  return (
    <div className="space-y-24">
      {daily && (
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <Link
            to="/artwork/$artworkId"
            params={{ artworkId: daily.id }}
            className="group relative flex animate-fade items-center justify-center bg-paper-2/60 p-6 sm:p-10 lg:p-14"
          >
            <MediaImage
              mediaId={daily.mediaIds[0]}
              variant="full"
              alt={daily.title}
              eager
              className="bg-transparent shadow-float transition-transform duration-700 ease-gallery group-hover:scale-[1.01]"
              imgClassName="max-h-[68vh] w-auto object-contain"
              style={{ viewTransitionName: `artwork-${daily.id}` }}
            />
          </Link>
          <div className="animate-rise">
            <p className="eyebrow text-ink-3">{t(greetingKey(new Date().getHours()))}</p>
            <p className="eyebrow mt-6 mb-5 text-accent">
              {t('salon.artworkOfTheDay')} · {format.date(todayIsoDate(), 'dayMonth')}
            </p>
            <h1 className="display text-[clamp(2.75rem,6vw,5.25rem)] font-[360]">{daily.title}</h1>
            <p className="caption mt-5 text-2xl text-ink-2">
              {[daily.artist, daily.year].filter(Boolean).join(', ')}
            </p>
            {dailyVenue && (
              <p className="mt-6 flex items-center gap-2 text-sm text-ink-3">
                <MapPinIcon className="size-4" /> {dailyVenue.name}
                {dailyPlace && (
                  <>
                    , <Flag code={dailyPlace.countryCode} /> {dailyPlace.name}
                  </>
                )}
              </p>
            )}
            {daily.notes && (
              <p className="mt-8 border-l-2 border-gold pl-5 font-display text-lg leading-relaxed text-ink-2 italic">
                {daily.notes}
              </p>
            )}
            <Button asChild variant="outline" className="mt-10 rounded-full">
              <Link to="/artwork/$artworkId" params={{ artworkId: daily.id }}>
                {t('salon.view')} <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {insights && (
        <section
          className={cn(
            'grid grid-cols-2 gap-x-6 gap-y-10 border-y border-line py-12',
            insights.library.books > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4',
          )}
        >
          <Stat
            value={insights.totals.countries}
            label={t('stats.countries', { count: insights.totals.countries })}
          />
          <Stat
            value={insights.totals.places}
            label={t('stats.cities', { count: insights.totals.places })}
          />
          <Stat
            value={insights.totals.venues}
            label={t('stats.venues', { count: insights.totals.venues })}
          />
          <Stat
            value={insights.totals.artworks}
            label={t('stats.artworks', { count: insights.totals.artworks })}
          />
          {insights.library.books > 0 && (
            <Stat
              value={insights.library.books}
              label={t('stats.books', { count: insights.library.books })}
            />
          )}
        </section>
      )}

      {insights && insights.library.reading.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link
                to="/library"
                className="eyebrow inline-flex items-center gap-1.5 text-ink-3 hover:text-accent"
              >
                {t('salon.toLibrary')} <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            {t('salon.reading')}
          </SectionTitle>
          <ReadingNow books={insights.library.reading} bare />
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link
                to="/collection"
                className="eyebrow inline-flex items-center gap-1.5 text-ink-3 hover:text-accent"
              >
                {t('salon.toCollection')} <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            {t('salon.recent')}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-6">
            {recent.map((a) => (
              <ArtworkCard key={a.id} artwork={a} crop />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-16 lg:grid-cols-2">
        <div>
          <SectionTitle>{t('salon.nextTrip')}</SectionTitle>
          {nextTrip ? (
            <TripTeaser tripId={nextTrip.id} />
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="caption text-lg text-ink-3">{t('salon.noTrip')}</p>
              <Button asChild variant="outline">
                <Link to="/planner">
                  <CompassIcon /> {t('salon.planTrip')}
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div>
          <SectionTitle
            action={
              <Link
                to="/journal"
                className="eyebrow inline-flex items-center gap-1.5 text-ink-3 hover:text-accent"
              >
                {t('nav.journal')} <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            {t('salon.lastVisits')}
          </SectionTitle>
          <ul className="divide-y divide-line">
            {visits.slice(0, 4).map((v) => {
              const venue = venues.get(v.venueId);
              const place = placeOfVenue(v.venueId);
              return (
                <li key={v.id}>
                  <Link
                    to="/venue/$venueId"
                    params={{ venueId: v.venueId }}
                    className="group flex items-baseline justify-between gap-4 py-4"
                  >
                    <span>
                      <span className="display text-xl font-[420] group-hover:text-accent">
                        {venue?.name}
                      </span>
                      <span className="ml-3 text-xs text-ink-3">
                        <Flag code={place?.countryCode} /> {place?.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-3 tabular-nums">
                      {format.date(v.date, 'medium')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {visits.length === 0 && (
            <p className="caption text-lg text-ink-3">{t('salon.noVisits')}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function TripTeaser({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const format = useFormat();
  const trips = useTrips();
  const { places } = useLookups();
  const trip = trips?.find((x) => x.id === tripId);
  const destination = trip?.placeIds[0] ? places.get(trip.placeIds[0]) : undefined;
  const summary = useWikiSummary(
    destination?.wikipedia,
    destination?.wikipedia ? undefined : destination?.name,
  );
  if (!trip) return null;
  const image = trip.coverImageUrl ?? summary.data?.imageUrl;

  return (
    <Link to="/trip/$tripId" params={{ tripId: trip.id }} className="group block">
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-2 shadow-frame">
        {image && (
          <img
            src={image}
            alt=""
            className="size-full object-cover transition-transform duration-1000 ease-gallery group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="eyebrow text-white/70">
            {trip.startDate
              ? format.date(trip.startDate, 'long')
              : t(`planner.status.${trip.status}`)}
          </p>
          <p className="display mt-2 text-4xl font-[380]">{trip.title}</p>
          <p className="mt-2 text-sm text-white/75">
            {t('planner.itemCount', { count: trip.items.length })}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Welcome() {
  const { t } = useTranslation();
  const store = useStore();
  const dialogs = useDialogs();
  const ctx = useProviderContext();
  const [seeding, setSeeding] = useState<string | null>(null);

  const loadDemo = async () => {
    setSeeding(t('salon.welcome.loading', { done: 0, total: 9 }));
    try {
      await seedDemo(store, ctx.locale, (done, total) =>
        setSeeding(t('salon.welcome.loading', { done, total })),
      );
      toast.success(t('salon.welcome.loaded'));
    } catch (error) {
      toast.error(t('salon.welcome.loadFailed'), { description: (error as Error).message });
    } finally {
      setSeeding(null);
    }
  };

  const features = [
    { icon: ImagesIcon, key: 'collect', action: () => dialogs.open({ type: 'artwork' }) },
    { icon: BookOpenIcon, key: 'remember', action: () => dialogs.open({ type: 'visit' }) },
    { icon: CompassIcon, key: 'plan', action: () => dialogs.open({ type: 'trip' }) },
  ] as const;

  return (
    <div className="py-6 md:py-16">
      <p className="eyebrow animate-rise text-accent">{t('salon.welcome.eyebrow')}</p>
      <h1 className="display mt-6 max-w-5xl animate-rise text-[clamp(3rem,8.5vw,7.5rem)] font-[330] [animation-delay:80ms]">
        {t('salon.welcome.title')}
      </h1>
      <p className="caption mt-8 max-w-2xl animate-rise text-xl leading-relaxed text-ink-2 [animation-delay:160ms] md:text-2xl">
        {t('salon.welcome.lede')}
      </p>
      <div className="mt-10 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
        <Button size="lg" onClick={() => dialogs.open({ type: 'artwork' })}>
          <PlusIcon /> {t('salon.welcome.start')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={seeding !== null}
          onClick={() => void loadDemo()}
        >
          <SparklesIcon /> {seeding ?? t('salon.welcome.demo')}
        </Button>
      </div>

      <div className="mt-24 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
        {features.map(({ icon: Icon, key, action }, i) => (
          <button
            key={key}
            type="button"
            onClick={action}
            className="group flex animate-rise cursor-pointer flex-col items-start gap-6 bg-paper p-8 text-left transition-colors hover:bg-surface md:p-10"
            style={{ animationDelay: `${320 + i * 80}ms` }}
          >
            <span className="eyebrow text-ink-3">0{i + 1}</span>
            <Icon className="size-7 text-accent" strokeWidth={1.25} />
            <span>
              <span className="display block text-3xl font-[400]">
                {t(`salon.welcome.${key}.title`)}
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-ink-2">
                {t(`salon.welcome.${key}.text`)}
              </span>
            </span>
            <span className="eyebrow mt-auto inline-flex items-center gap-1.5 text-ink-3 transition-colors group-hover:text-accent">
              {t(`salon.welcome.${key}.cta`)} <ArrowRightIcon className="size-3.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
