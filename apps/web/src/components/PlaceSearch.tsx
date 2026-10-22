import { normalizeName, type Place, type Venue, type VenueKind, venueKinds } from '@mnemo/core';
import { type PlaceResult, photonProvider } from '@mnemo/providers';
import { Button, Combobox, Field, Input, Select } from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import { PencilLineIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlaces, useProviderContext, useVenues } from '../app/data';
import { useStore } from '../app/store';
import { useDebounced } from '../lib/hooks';
import { importCity, importVenue } from '../lib/places';
import { Flag, KindIcon } from './bits';

type CityOption =
  | { type: 'own'; place: Place }
  | { type: 'remote'; result: PlaceResult }
  | { type: 'manual'; name: string };

/** City search across own places and OpenStreetMap; always offers a manual entry. */
export function CitySearch({
  onSelect,
  placeholder,
  autoFocus,
  id,
}: {
  onSelect: (place: Place) => void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const ctx = useProviderContext();
  const places = usePlaces();
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 350);

  const remote = useQuery({
    queryKey: ['photon', 'cities', q, ctx.locale],
    queryFn: ({ signal }) => photonProvider.searchCities(q, { ...ctx, signal }),
    enabled: q.length >= 2,
  });

  const options = useMemo<CityOption[]>(() => {
    const needle = normalizeName(query);
    const own = (places ?? [])
      .filter((p) => needle && normalizeName(p.name).includes(needle))
      .slice(0, 4)
      .map((place): CityOption => ({ type: 'own', place }));
    const ownKeys = new Set(
      own.map((o) =>
        o.type === 'own' ? `${normalizeName(o.place.name)}|${o.place.countryCode}` : '',
      ),
    );
    const fromRemote = (remote.data ?? [])
      .filter((r) => !ownKeys.has(`${normalizeName(r.name)}|${r.countryCode}`))
      .map((result): CityOption => ({ type: 'remote', result }));
    const manual: CityOption[] = query.trim() ? [{ type: 'manual', name: query.trim() }] : [];
    return [...own, ...fromRemote, ...manual];
  }, [places, remote.data, query]);

  const select = async (option: CityOption) => {
    const place =
      option.type === 'own'
        ? option.place
        : option.type === 'remote'
          ? await importCity(store, option.result)
          : await store.places.create({ name: option.name });
    setQuery('');
    onSelect(place);
  };

  return (
    <Combobox
      id={id}
      query={query}
      onQueryChange={setQuery}
      items={options}
      loading={remote.isFetching}
      autoFocus={autoFocus}
      placeholder={placeholder ?? t('places.searchCity')}
      getKey={(o) =>
        o.type === 'own'
          ? `own-${o.place.id}`
          : o.type === 'remote'
            ? `r-${o.result.osmId ?? o.result.name}`
            : 'manual'
      }
      onSelect={(o) => void select(o)}
      renderItem={(o) =>
        o.type === 'manual' ? (
          <span className="flex items-center gap-2 text-ink-3">
            <PencilLineIcon className="size-4" /> {t('places.useAsName', { name: o.name })}
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <Flag
              code={o.type === 'own' ? o.place.countryCode : o.result.countryCode}
              className="text-base"
            />
            <span className="flex-1">
              <span className="text-ink">{o.type === 'own' ? o.place.name : o.result.name}</span>
              <span className="ml-2 text-xs text-ink-3">
                {o.type === 'own' ? o.place.country : o.result.country}
              </span>
            </span>
            {o.type === 'own' && (
              <span className="eyebrow text-[0.625rem] text-accent">{t('places.yours')}</span>
            )}
          </span>
        )
      }
    />
  );
}

type VenueOption =
  | { type: 'own'; venue: Venue }
  | { type: 'remote'; result: PlaceResult }
  | { type: 'manual'; name: string };

/**
 * Picks a venue: own venues first, then museums and sights from OpenStreetMap. Choosing a
 * remote result creates the venue (and its city) on the fly.
 */
export function VenuePicker({
  onSelect,
  autoFocus,
  initialQuery = '',
  id,
}: {
  onSelect: (venue: Venue) => void;
  autoFocus?: boolean;
  initialQuery?: string;
  id?: string;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const ctx = useProviderContext();
  const venues = useVenues();
  const places = usePlaces();
  const [query, setQuery] = useState(initialQuery);
  const [manual, setManual] = useState<string | null>(null);
  const q = useDebounced(query.trim(), 350);

  const remote = useQuery({
    queryKey: ['photon', 'venues', q, ctx.locale],
    queryFn: ({ signal }) => photonProvider.searchVenues(q, { ...ctx, signal }),
    enabled: q.length >= 3,
  });

  const placeName = (id: string) => places?.find((p) => p.id === id)?.name ?? '';

  const options = useMemo<VenueOption[]>(() => {
    const placeNames = new Map((places ?? []).map((p) => [p.id, p.name]));
    const needle = normalizeName(query);
    const own = (venues ?? [])
      .filter(
        (v) =>
          needle && normalizeName(`${v.name} ${placeNames.get(v.placeId) ?? ''}`).includes(needle),
      )
      .slice(0, 5)
      .map((venue): VenueOption => ({ type: 'own', venue }));
    const ownOsm = new Set(
      own.map((o) => (o.type === 'own' ? o.venue.osmId : undefined)).filter(Boolean),
    );
    const fromRemote = (remote.data ?? [])
      .filter((r) => !r.osmId || !ownOsm.has(r.osmId))
      .map((result): VenueOption => ({ type: 'remote', result }));
    return [
      ...own,
      ...fromRemote,
      ...(query.trim() ? [{ type: 'manual', name: query.trim() } as const] : []),
    ];
  }, [venues, places, remote.data, query]);

  const [busy, setBusy] = useState(false);
  const select = async (option: VenueOption) => {
    if (option.type === 'manual') {
      setManual(option.name);
      return;
    }
    setBusy(true);
    try {
      onSelect(option.type === 'own' ? option.venue : await importVenue(store, option.result, ctx));
      setQuery('');
    } finally {
      setBusy(false);
    }
  };

  if (manual !== null) {
    return (
      <ManualVenue initialName={manual} onCancel={() => setManual(null)} onCreated={onSelect} />
    );
  }

  return (
    <Combobox
      id={id}
      query={query}
      onQueryChange={setQuery}
      items={options}
      loading={remote.isFetching || busy}
      autoFocus={autoFocus}
      placeholder={t('places.searchVenue')}
      getKey={(o) =>
        o.type === 'own'
          ? `own-${o.venue.id}`
          : o.type === 'remote'
            ? `r-${o.result.osmId ?? o.result.name}`
            : 'manual'
      }
      onSelect={(o) => void select(o)}
      renderItem={(o) =>
        o.type === 'manual' ? (
          <span className="flex items-center gap-2 text-ink-3">
            <PlusIcon className="size-4" /> {t('places.createManually', { name: o.name })}
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <KindIcon
              kind={o.type === 'own' ? o.venue.kind : (o.result.venueKind ?? 'other')}
              className="text-ink-3"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">
                {o.type === 'own' ? o.venue.name : o.result.name}
              </span>
              <span className="block truncate text-xs text-ink-3">
                {o.type === 'own'
                  ? placeName(o.venue.placeId)
                  : [o.result.city, o.result.country].filter(Boolean).join(', ')}
              </span>
            </span>
            {o.type === 'own' && (
              <span className="eyebrow text-[0.625rem] text-accent">{t('places.yours')}</span>
            )}
          </span>
        )
      }
    />
  );
}

function ManualVenue({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (venue: Venue) => void;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<VenueKind>('museum');
  const [place, setPlace] = useState<Place | null>(null);

  return (
    <div className="space-y-4 rounded-frame border border-line bg-paper/60 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label={t('venue.name')}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label={t('venue.kind')}>
          {(id) => (
            <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as VenueKind)}>
              {venueKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`venue.kinds.${k}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label={t('venue.city')}>
        {(id) =>
          place ? (
            <div className="flex h-10 items-center justify-between rounded-frame border border-line-strong px-3 text-sm">
              <span>
                <Flag code={place.countryCode} /> {place.name}
              </span>
              <Button variant="link" size="sm" onClick={() => setPlace(null)}>
                {t('common.change')}
              </Button>
            </div>
          ) : (
            <CitySearch id={id} onSelect={setPlace} />
          )
        }
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.back')}
        </Button>
        <Button
          size="sm"
          disabled={!name.trim() || !place}
          onClick={async () => {
            if (!place) return;
            onCreated(
              await store.venues.create({
                name: name.trim(),
                kind,
                placeId: place.id,
                coords: place.coords,
              }),
            );
          }}
        >
          {t('common.create')}
        </Button>
      </div>
    </div>
  );
}
