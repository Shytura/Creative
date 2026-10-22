import { createId, type MnemoStore, type VenueKind } from '@mnemo/core';
import { saveRemoteImage } from './media';

type L = { de: string; en: string };

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1600`;

const PLACES = {
  vienna: {
    name: { de: 'Wien', en: 'Vienna' },
    country: { de: 'Österreich', en: 'Austria' },
    countryCode: 'AT',
    coords: { lat: 48.2083, lng: 16.3725 },
  },
  amsterdam: {
    name: { de: 'Amsterdam', en: 'Amsterdam' },
    country: { de: 'Niederlande', en: 'Netherlands' },
    countryCode: 'NL',
    coords: { lat: 52.3731, lng: 4.8924 },
  },
  paris: {
    name: { de: 'Paris', en: 'Paris' },
    country: { de: 'Frankreich', en: 'France' },
    countryCode: 'FR',
    coords: { lat: 48.8566, lng: 2.3522 },
  },
  florence: {
    name: { de: 'Florenz', en: 'Florence' },
    country: { de: 'Italien', en: 'Italy' },
    countryCode: 'IT',
    coords: { lat: 43.7696, lng: 11.2558 },
  },
  newYork: {
    name: { de: 'New York', en: 'New York' },
    country: { de: 'Vereinigte Staaten', en: 'United States' },
    countryCode: 'US',
    coords: { lat: 40.7128, lng: -74.006 },
  },
} as const;
type PlaceKey = keyof typeof PLACES;

const VENUES: Record<
  string,
  { place: PlaceKey; name: string; kind: VenueKind; lat: number; lng: number; wikipedia: string }
> = {
  belvedere: {
    place: 'vienna',
    name: 'Oberes Belvedere',
    kind: 'museum',
    lat: 48.1915,
    lng: 16.3809,
    wikipedia: 'de:Schloss Belvedere',
  },
  albertina: {
    place: 'vienna',
    name: 'Albertina',
    kind: 'museum',
    lat: 48.2046,
    lng: 16.3683,
    wikipedia: 'de:Albertina (Wien)',
  },
  khm: {
    place: 'vienna',
    name: 'Kunsthistorisches Museum',
    kind: 'museum',
    lat: 48.2038,
    lng: 16.3617,
    wikipedia: 'de:Kunsthistorisches Museum',
  },
  rijks: {
    place: 'amsterdam',
    name: 'Rijksmuseum',
    kind: 'museum',
    lat: 52.36,
    lng: 4.8852,
    wikipedia: 'de:Rijksmuseum',
  },
  marmottan: {
    place: 'paris',
    name: 'Musée Marmottan Monet',
    kind: 'museum',
    lat: 48.8592,
    lng: 2.2673,
    wikipedia: 'de:Musée Marmottan Monet',
  },
};

const VISITS: Array<{ venue: string; date: string; rating: number; notes: L }> = [
  {
    venue: 'belvedere',
    date: '2023-04-14',
    rating: 5,
    notes: {
      de: 'Früh am Morgen, fast allein vor dem Kuss. Das Gold wirkt in echt viel wärmer.',
      en: 'Early morning, almost alone in front of The Kiss. The gold feels so much warmer in person.',
    },
  },
  { venue: 'albertina', date: '2023-04-15', rating: 4, notes: { de: '', en: '' } },
  {
    venue: 'khm',
    date: '2023-04-15',
    rating: 5,
    notes: {
      de: 'Der Bruegel-Saal ist ein Wimmelbild für Stunden.',
      en: 'The Bruegel room could keep you busy for hours.',
    },
  },
  {
    venue: 'rijks',
    date: '2024-09-21',
    rating: 5,
    notes: {
      de: 'Die Nachtwache wird gerade restauriert – hinter Glas live zu sehen.',
      en: 'The Night Watch is being restored – visible live behind glass.',
    },
  },
  {
    venue: 'marmottan',
    date: '2025-03-08',
    rating: 4,
    notes: {
      de: 'Kleines, ruhiges Museum. Impression im Untergeschoss.',
      en: 'Small and quiet. Impression hangs in the basement.',
    },
  },
];

const ARTWORKS: Array<{
  title: L;
  artist: string;
  year: string;
  medium: L;
  file: string;
  venue?: string;
  status: 'seen' | 'wishlist';
  favorite?: boolean;
  tags: string[];
  notes?: L;
  dutch?: boolean;
}> = [
  {
    title: { de: 'Der Kuss', en: 'The Kiss' },
    artist: 'Gustav Klimt',
    year: '1908–1909',
    medium: { de: 'Öl und Blattgold auf Leinwand', en: 'Oil and gold leaf on canvas' },
    file: 'The Kiss - Gustav Klimt - Google Cultural Institute.jpg',
    venue: 'belvedere',
    status: 'seen',
    favorite: true,
    tags: ['gold', 'jugendstil'],
    notes: {
      de: 'Die Blumenwiese am Rand ist mein Lieblingsdetail.',
      en: 'The flower meadow at the edge is my favourite detail.',
    },
  },
  {
    title: { de: 'Feldhase', en: 'Young Hare' },
    artist: 'Albrecht Dürer',
    year: '1502',
    medium: { de: 'Aquarell und Deckfarben', en: 'Watercolour and gouache' },
    file: 'Albrecht Dürer - Hare, 1502 - Google Art Project.jpg',
    venue: 'albertina',
    status: 'seen',
    tags: ['natur'],
  },
  {
    title: { de: 'Turmbau zu Babel', en: 'The Tower of Babel' },
    artist: 'Pieter Bruegel d. Ä.',
    year: '1563',
    medium: { de: 'Öl auf Holz', en: 'Oil on panel' },
    file: 'Pieter Bruegel the Elder - The Tower of Babel (Vienna) - Google Art Project - edited.jpg',
    venue: 'khm',
    status: 'seen',
    favorite: true,
    tags: ['architektur'],
  },
  {
    title: { de: 'Das Milchmädchen', en: 'The Milkmaid' },
    artist: 'Johannes Vermeer',
    year: 'um 1660',
    medium: { de: 'Öl auf Leinwand', en: 'Oil on canvas' },
    file: 'Johannes Vermeer - Het melkmeisje - Google Art Project.jpg',
    venue: 'rijks',
    status: 'seen',
    favorite: true,
    tags: ['licht'],
    dutch: true,
  },
  {
    title: { de: 'Die Nachtwache', en: 'The Night Watch' },
    artist: 'Rembrandt van Rijn',
    year: '1642',
    medium: { de: 'Öl auf Leinwand', en: 'Oil on canvas' },
    file: 'The Night Watch - HD.jpg',
    venue: 'rijks',
    status: 'seen',
    tags: ['licht'],
    dutch: true,
  },
  {
    title: { de: 'Impression, Sonnenaufgang', en: 'Impression, Sunrise' },
    artist: 'Claude Monet',
    year: '1872',
    medium: { de: 'Öl auf Leinwand', en: 'Oil on canvas' },
    file: 'Monet - Impression, Sunrise.jpg',
    venue: 'marmottan',
    status: 'seen',
    favorite: true,
    tags: ['impressionismus'],
  },
  {
    title: { de: 'Die Sternennacht', en: 'The Starry Night' },
    artist: 'Vincent van Gogh',
    year: '1889',
    medium: { de: 'Öl auf Leinwand', en: 'Oil on canvas' },
    file: 'Van Gogh - Starry Night - Google Art Project.jpg',
    status: 'wishlist',
    tags: ['nacht'],
  },
  {
    title: { de: 'Die Geburt der Venus', en: 'The Birth of Venus' },
    artist: 'Sandro Botticelli',
    year: 'um 1485',
    medium: { de: 'Tempera auf Leinwand', en: 'Tempera on canvas' },
    file: 'Sandro Botticelli - La nascita di Venere - Google Art Project - edited.jpg',
    status: 'wishlist',
    tags: ['renaissance'],
  },
  {
    title: { de: 'Die große Welle vor Kanagawa', en: 'The Great Wave off Kanagawa' },
    artist: 'Katsushika Hokusai',
    year: 'um 1831',
    medium: { de: 'Farbholzschnitt', en: 'Woodblock print' },
    file: 'Tsunami by hokusai 19th century.jpg',
    status: 'wishlist',
    tags: ['japan'],
  },
];

const TAGS_EN: Record<string, string> = {
  natur: 'nature',
  licht: 'light',
  architektur: 'architecture',
  nacht: 'night',
  impressionismus: 'impressionism',
  jugendstil: 'art nouveau',
};

/**
 * Seeds a small, realistic sample archive using public-domain works from Wikimedia Commons.
 * Images are downloaded and stored locally, so palettes and offline use work like real data.
 */
export async function seedDemo(
  store: MnemoStore,
  locale: 'de' | 'en',
  onProgress?: (done: number, total: number) => void,
) {
  const pick = (l: L) => l[locale];
  const placeIds = {} as Record<PlaceKey, string>;
  for (const [key, p] of Object.entries(PLACES) as Array<[PlaceKey, (typeof PLACES)[PlaceKey]]>) {
    placeIds[key] = (
      await store.places.create({
        name: pick(p.name),
        country: pick(p.country),
        countryCode: p.countryCode,
        coords: p.coords,
      })
    ).id;
  }

  const venueIds: Record<string, string> = {};
  for (const [key, v] of Object.entries(VENUES)) {
    venueIds[key] = (
      await store.venues.create({
        placeId: placeIds[v.place],
        name: v.name,
        kind: v.kind,
        coords: { lat: v.lat, lng: v.lng },
        wikipedia: v.wikipedia,
      })
    ).id;
  }

  const visitIds: Record<string, string> = {};
  for (const v of VISITS) {
    const venueId = venueIds[v.venue];
    if (!venueId) continue;
    visitIds[v.venue] = (
      await store.visits.create({ venueId, date: v.date, rating: v.rating, notes: pick(v.notes) })
    ).id;
  }

  const favorites: string[] = [];
  const dutch: string[] = [];
  let done = 0;
  for (const a of ARTWORKS) {
    const title = pick(a.title);
    const media = await saveRemoteImage(store, commons(a.file), title);
    const created = await store.artworks.create({
      title,
      artist: a.artist,
      year: a.year,
      medium: pick(a.medium),
      status: a.status,
      venueId: a.venue ? venueIds[a.venue] : undefined,
      visitId: a.venue ? visitIds[a.venue] : undefined,
      favorite: a.favorite ?? false,
      tags: locale === 'en' ? a.tags.map((tag) => TAGS_EN[tag] ?? tag) : a.tags,
      notes: a.notes ? pick(a.notes) : '',
      mediaIds: [media.id],
      palette: media.palette,
      source: {
        provider: 'wikidata',
        externalId: a.file,
        url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(a.file)}`,
        license: 'Public domain',
        credit: 'Wikimedia Commons',
      },
    });
    if (a.favorite) favorites.push(created.id);
    if (a.dutch) dutch.push(created.id);
    onProgress?.(++done, ARTWORKS.length);
  }

  await store.collections.create({
    name: locale === 'de' ? 'Lieblingswerke' : 'Favourites',
    description:
      locale === 'de'
        ? 'Werke, zu denen ich immer wieder zurückkehre.'
        : 'Works I keep coming back to.',
    items: favorites.map((id) => ({ kind: 'artwork' as const, id })),
  });
  await store.collections.create({
    name: locale === 'de' ? 'Niederländische Meister' : 'Dutch Masters',
    items: dutch.map((id) => ({ kind: 'artwork' as const, id })),
  });

  await store.trips.create({
    title: locale === 'de' ? 'Florenz im Frühling' : 'Florence in spring',
    status: 'planned',
    placeIds: [placeIds.florence],
    startDate: '2027-04-08',
    endDate: '2027-04-12',
    notes: locale === 'de' ? 'Uffizien-Tickets früh reservieren!' : 'Book Uffizi tickets early!',
    items: [
      {
        id: createId(),
        name: 'Galleria degli Uffizi',
        kind: 'museum',
        placeId: placeIds.florence,
        coords: { lat: 43.7678, lng: 11.2553 },
        wikipedia: 'de:Uffizien',
      },
      {
        id: createId(),
        name: 'Galleria dell’Accademia',
        kind: 'museum',
        placeId: placeIds.florence,
        coords: { lat: 43.7768, lng: 11.2586 },
        wikipedia: 'de:Galleria dell’Accademia (Florenz)',
      },
      {
        id: createId(),
        name: 'Santa Maria del Fiore',
        kind: 'church',
        placeId: placeIds.florence,
        coords: { lat: 43.7731, lng: 11.256 },
        wikipedia: 'de:Santa Maria del Fiore',
      },
      {
        id: createId(),
        name: 'Palazzo Pitti',
        kind: 'castle',
        placeId: placeIds.florence,
        coords: { lat: 43.7651, lng: 11.25 },
        wikipedia: 'de:Palazzo Pitti',
      },
    ],
  });
  await store.trips.create({
    title: locale === 'de' ? 'Eine Woche New York' : 'A week in New York',
    status: 'idea',
    placeIds: [placeIds.newYork],
    items: [
      {
        id: createId(),
        name: 'Museum of Modern Art',
        kind: 'museum',
        placeId: placeIds.newYork,
        coords: { lat: 40.7614, lng: -73.9776 },
        wikipedia: 'de:Museum of Modern Art',
      },
      {
        id: createId(),
        name: 'The Metropolitan Museum of Art',
        kind: 'museum',
        placeId: placeIds.newYork,
        coords: { lat: 40.7794, lng: -73.9632 },
        wikipedia: 'de:Metropolitan Museum of Art',
      },
    ],
  });
}
