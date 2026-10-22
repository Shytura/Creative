import {
  type Artwork,
  computeInsights,
  defaultSettings,
  type EntityTable,
  type Media,
  type MediaVariant,
  type MnemoStore,
  type Place,
  type Venue,
} from '@mnemo/core';
import type { ProviderContext } from '@mnemo/providers';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useObjectUrl } from '../lib/hooks';
import { useStore } from './store';

function useLocal<T>(
  table: EntityTable | 'all',
  key: unknown[],
  fn: (store: MnemoStore) => Promise<T>,
) {
  const store = useStore();
  return useQuery({
    queryKey: ['local', table, ...key],
    queryFn: () => fn(store),
    staleTime: Number.POSITIVE_INFINITY,
    networkMode: 'always',
  });
}

const byNewest = <T extends { createdAt: string }>(items: T[]) =>
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const useArtworks = () =>
  useLocal('artworks', [], (s) => s.artworks.list().then(byNewest)).data;
export const useArtwork = (id: string) =>
  useLocal('artworks', [id], (s) => s.artworks.get(id).then((a) => a ?? null));
export const useBooks = () => useLocal('books', [], (s) => s.books.list().then(byNewest)).data;
export const useBook = (id: string) =>
  useLocal('books', [id], (s) => s.books.get(id).then((b) => b ?? null));
export const usePlaces = () =>
  useLocal('places', [], (s) =>
    s.places.list().then((p) => p.sort((a, b) => a.name.localeCompare(b.name))),
  ).data;
export const useVenues = () =>
  useLocal('venues', [], (s) =>
    s.venues.list().then((v) => v.sort((a, b) => a.name.localeCompare(b.name))),
  ).data;
export const useVisits = () =>
  useLocal('visits', [], (s) =>
    s.visits.list().then((v) => v.sort((a, b) => b.date.localeCompare(a.date))),
  ).data;
export const useCollections = () =>
  useLocal('collections', [], (s) =>
    s.collections.list().then((c) => c.sort((a, b) => a.name.localeCompare(b.name))),
  ).data;
export const useCreators = () =>
  useLocal('creators', [], (s) =>
    s.creators.list().then((c) => c.sort((a, b) => a.name.localeCompare(b.name))),
  ).data;
export const useTrips = () => useLocal('trips', [], (s) => s.trips.list().then(byNewest)).data;
export const useMediaList = () => useLocal('media', [], (s) => s.media.list()).data;

export function useSettings() {
  return useLocal('settings', [], (s) => s.settings.get()).data ?? defaultSettings;
}

export function useMedia(id: string | undefined): Media | undefined {
  return (
    useLocal('media', ['meta', id], (s) =>
      id ? s.media.get(id).then((m) => m ?? null) : Promise.resolve(null),
    ).data ?? undefined
  );
}

/** Displayable URL for a media item: local blob if stored, remote URL otherwise. */
export function useMediaUrl(
  id: string | undefined,
  variant: MediaVariant = 'thumb',
): string | undefined {
  const media = useMedia(id);
  const blob = useLocal('media', ['blob', id, variant, media?.hasBlob], (s) =>
    id && media?.hasBlob
      ? s.media.getBlob(id, variant).then((b) => b ?? null)
      : Promise.resolve(null),
  ).data;
  const objectUrl = useObjectUrl(blob);
  return objectUrl ?? media?.remoteUrl;
}

export interface Lookups {
  venues: Map<string, Venue>;
  places: Map<string, Place>;
  placeOfVenue: (venueId: string | undefined) => Place | undefined;
}

export function useLookups(): Lookups {
  const venues = useVenues();
  const places = usePlaces();
  return useMemo(() => {
    const venueMap = new Map((venues ?? []).map((v) => [v.id, v]));
    const placeMap = new Map((places ?? []).map((p) => [p.id, p]));
    return {
      venues: venueMap,
      places: placeMap,
      placeOfVenue: (venueId) => {
        const placeId = venueId ? venueMap.get(venueId)?.placeId : undefined;
        return placeId ? placeMap.get(placeId) : undefined;
      },
    };
  }, [venues, places]);
}

export function useInsights() {
  const places = usePlaces();
  const venues = useVenues();
  const visits = useVisits();
  const artworks = useArtworks();
  const books = useBooks();
  const creators = useCreators();
  return useMemo(() => {
    if (!places || !venues || !visits || !artworks || !books || !creators) return undefined;
    return computeInsights({ places, venues, visits, artworks, books, creators });
  }, [places, venues, visits, artworks, books, creators]);
}

/** Context passed to external API providers: UI language and optional API keys. */
export function useProviderContext(): Omit<ProviderContext, 'signal'> {
  const { i18n } = useTranslation();
  const settings = useSettings();
  return useMemo(
    () => ({ locale: i18n.resolvedLanguage === 'en' ? 'en' : 'de', keys: settings.providerKeys }),
    [i18n.resolvedLanguage, settings.providerKeys],
  );
}

export function artworksAt(artworks: readonly Artwork[] | undefined, venueId: string) {
  return (artworks ?? []).filter((a) => a.venueId === venueId);
}
