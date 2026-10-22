import { sortByHue } from '../lib/color';
import type { Artwork, Book, Creator, Place, Venue, Visit } from '../model/entities';

export interface InsightsInput {
  places: readonly Place[];
  venues: readonly Venue[];
  visits: readonly Visit[];
  artworks: readonly Artwork[];
  books: readonly Book[];
  creators: readonly Creator[];
}

export interface LibraryInsight {
  /** Books on the shelf (owned or borrowed), not on the wishlist. */
  books: number;
  /** Finished readings, re-reads included. */
  read: number;
  pagesRead: number;
  reading: Book[];
  lent: Book[];
  readByYear: Array<{ year: number; count: number }>;
}

export interface CountryInsight {
  code: string | undefined;
  name: string;
  places: Place[];
  visitCount: number;
}

export interface Insights {
  totals: {
    countries: number;
    places: number;
    venues: number;
    visits: number;
    artworks: number;
    favorites: number;
    wishlist: number;
  };
  countries: CountryInsight[];
  visitsByYear: Array<{ year: number; count: number }>;
  /** People with the most works across all collectible kinds, wishlists excluded. */
  topCreators: Array<{ creator: Creator; count: number }>;
  library: LibraryInsight;
  topVenues: Array<{ venue: Venue; count: number }>;
  spectrum: string[];
  firstVisit: Visit | undefined;
  visitedVenueIds: Set<string>;
  visitedPlaceIds: Set<string>;
}

/**
 * A venue counts as visited when there is a visit or a seen artwork for it. A place counts as
 * visited when one of its venues does.
 */
export function computeInsights({
  places,
  venues,
  visits,
  artworks,
  books,
  creators,
}: InsightsInput): Insights {
  const seen = artworks.filter((a) => a.status === 'seen');
  const visitedVenueIds = new Set<string>([
    ...visits.map((v) => v.venueId),
    ...seen.flatMap((a) => (a.venueId ? [a.venueId] : [])),
  ]);
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const visitedPlaceIds = new Set(
    [...visitedVenueIds].flatMap((id) => {
      const placeId = venueById.get(id)?.placeId;
      return placeId ? [placeId] : [];
    }),
  );
  const visitedPlaces = places.filter((p) => visitedPlaceIds.has(p.id));

  const visitsPerPlace = new Map<string, number>();
  for (const visit of visits) {
    const placeId = venueById.get(visit.venueId)?.placeId;
    if (placeId) visitsPerPlace.set(placeId, (visitsPerPlace.get(placeId) ?? 0) + 1);
  }

  const countryMap = new Map<string, CountryInsight>();
  for (const place of visitedPlaces) {
    const key = place.countryCode ?? place.country ?? '?';
    const entry = countryMap.get(key) ?? {
      code: place.countryCode,
      name: place.country,
      places: [],
      visitCount: 0,
    };
    entry.places.push(place);
    entry.visitCount += visitsPerPlace.get(place.id) ?? 0;
    countryMap.set(key, entry);
  }
  const countries = [...countryMap.values()].sort(
    (a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name),
  );

  const years = new Map<number, number>();
  for (const v of visits) {
    const year = Number(v.date.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + 1);
  }
  const visitsByYear = [...years]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const venueCounts = new Map<string, number>();
  for (const v of visits) venueCounts.set(v.venueId, (venueCounts.get(v.venueId) ?? 0) + 1);
  const topVenues = [...venueCounts]
    .flatMap(([id, count]) => {
      const venue = venueById.get(id);
      return venue ? [{ venue, count }] : [];
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const creatorCounts = new Map<string, number>();
  const shelved = books.filter((b) => b.ownership !== 'wishlist');
  for (const item of [...seen, ...shelved]) {
    for (const id of item.creatorIds) creatorCounts.set(id, (creatorCounts.get(id) ?? 0) + 1);
  }
  const topCreators = [...creatorCounts]
    .flatMap(([id, count]) => {
      const creator = creatorById.get(id);
      return creator ? [{ creator, count }] : [];
    })
    .sort((a, b) => b.count - a.count || a.creator.name.localeCompare(b.creator.name))
    .slice(0, 8);

  const finished = books.flatMap((b) =>
    b.readings.flatMap((r) => (r.finishedOn ? [{ book: b, on: r.finishedOn }] : [])),
  );
  const readYears = new Map<number, number>();
  for (const { on } of finished) {
    const year = Number(on.slice(0, 4));
    readYears.set(year, (readYears.get(year) ?? 0) + 1);
  }
  const library: LibraryInsight = {
    books: shelved.length,
    read: finished.length,
    pagesRead: finished.reduce((sum, { book }) => sum + (book.pageCount ?? 0), 0),
    reading: books.filter((b) => b.status === 'reading'),
    lent: books.filter((b) => b.loan),
    readByYear: [...readYears]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
  };

  const firstVisit = [...visits].sort((a, b) => a.date.localeCompare(b.date))[0];

  return {
    totals: {
      countries: countries.length,
      places: visitedPlaces.length,
      venues: visitedVenueIds.size,
      visits: visits.length,
      artworks: seen.length,
      favorites: artworks.filter((a) => a.favorite).length,
      wishlist: artworks.length - seen.length,
    },
    countries,
    visitsByYear,
    topCreators,
    library,
    topVenues,
    spectrum: sortByHue(seen.flatMap((a) => a.palette.slice(0, 3))),
    firstVisit,
    visitedVenueIds,
    visitedPlaceIds,
  };
}
