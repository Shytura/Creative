import { describe, expect, it, vi } from 'vitest';
import {
  aicProvider,
  availableArtProviders,
  buildOverpassQuery,
  buildWikidataQuery,
  commonsFileName,
  fetchJson,
  mapAic,
  mapCleveland,
  mapEuropeana,
  mapMetObject,
  mapOverpass,
  mapPhotonFeature,
  mapSummary,
  mapWikidata,
  mapWikidataPerson,
  metProvider,
  overpassProvider,
  ProviderError,
  photonProvider,
  providersNeedingKeys,
  resolveCommonsImage,
  venueKindFromTags,
  wikidataPeopleProvider,
  wikidataProvider,
  wikidataYear,
  wikipediaSummary,
} from '../src';
import aicSearch from './fixtures/aic-search.json';
import cmaSearch from './fixtures/cma-search.json';
import metObject from './fixtures/met-object.json';
import metSearch from './fixtures/met-search.json';
import overpass from './fixtures/overpass.json';
import photonCities from './fixtures/photon-cities.json';
import wikidataPeopleEntities from './fixtures/wikidata-people-entities.json';
import wikidataPeopleSearch from './fixtures/wikidata-people-search.json';
import wikidataSearch from './fixtures/wikidata-search.json';
import wikipediaDisambiguation from './fixtures/wikipedia-summary.json';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('art provider mapping', () => {
  it('maps the Art Institute of Chicago with IIIF urls', () => {
    const [first] = mapAic(aicSearch as never);
    expect(first).toMatchObject({
      provider: 'aic',
      externalId: '16568',
      title: 'Water Lilies',
      artist: 'Claude Monet',
      year: '1906',
      license: 'CC0',
      iiifInfoUrl: 'https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/info.json',
    });
    expect(first?.thumbnailUrl).toContain('/full/400,/0/default.jpg');
  });

  it('maps Met objects and skips objects without image', () => {
    expect(mapMetObject(metObject)).toMatchObject({
      title: 'Sunflowers',
      artist: 'Vincent van Gogh',
      museumName: 'The Metropolitan Museum of Art',
    });
    expect(mapMetObject({ objectID: 1, title: 'x' })).toBeUndefined();
  });

  it('maps Cleveland and strips artist biography', () => {
    const [first] = mapCleveland(cmaSearch as never);
    expect(first).toMatchObject({
      title: 'The Red Kerchief',
      artist: 'Claude Monet',
      license: 'CC0',
    });
  });

  it('maps Wikidata bindings, deduplicates items and forces https', () => {
    const results = mapWikidata(wikidataSearch as never);
    const starryNight = results.find((r) => r.externalId === 'Q45585');
    expect(starryNight).toMatchObject({
      title: 'Sternennacht',
      artist: 'Vincent van Gogh',
      year: '1889',
      museumName: 'Museum of Modern Art',
    });
    expect(starryNight?.imageUrl?.startsWith('https://')).toBe(true);
    expect(new Set(results.map((r) => r.externalId)).size).toBe(results.length);
  });

  it('escapes user input in SPARQL', () => {
    const q = buildWikidataQuery('Mona "Lisa"} DROP', 'de');
    expect(q).toContain('mwapi:search "Mona \\"Lisa\\"} DROP"');
  });

  it('maps Europeana items', () => {
    const [item] = mapEuropeana({
      items: [
        {
          id: '/1/a',
          title: ['Das Milchmädchen'],
          dcCreator: ['http://x', 'Johannes Vermeer'],
          edmPreview: ['http://img/p.jpg'],
        },
      ],
    });
    expect(item).toMatchObject({ artist: 'Johannes Vermeer', thumbnailUrl: 'https://img/p.jpg' });
  });

  it('only offers keyed providers when a key is set', () => {
    expect(availableArtProviders().map((p) => p.id)).not.toContain('europeana');
    expect(availableArtProviders({ europeana: 'k' }).map((p) => p.id)).toContain('europeana');
    expect(providersNeedingKeys().map((p) => p.requiresKey.id)).toEqual(['europeana', 'harvard']);
  });
});

describe('art provider requests', () => {
  it('queries the AIC search endpoint', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request) => json(aicSearch));
    const results = await aicProvider.search('monet', { locale: 'de', fetch: fetch as never });
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      'api.artic.edu/api/v1/artworks/search?q=monet',
    );
    expect(results).toHaveLength(2);
  });

  it('uses the Met v1.1 search and tolerates failing objects', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('/v1.1/search')) return json(metSearch);
      if (u.endsWith('/436524')) return json(metObject);
      return json({ message: 'not found' }, 404);
    });
    const results = await metProvider.search('sunflowers', { locale: 'en', fetch: fetch as never });
    expect(results.map((r) => r.externalId)).toEqual(['436524']);
  });

  it('cancels a throttled request when aborted', async () => {
    const fetch = vi.fn(async () => json({ ok: true }));
    const url = 'https://throttle.test/x';
    await fetchJson('t', url, { locale: 'de', fetch: fetch as never }, { minIntervalMs: 60_000 });
    const controller = new AbortController();
    const pending = fetchJson(
      't',
      url,
      { locale: 'de', fetch: fetch as never, signal: controller.signal },
      { minIntervalMs: 60_000 },
    );
    controller.abort(new Error('stop'));
    await expect(pending).rejects.toThrow('stop');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('wraps HTTP errors', async () => {
    const fetch = vi.fn(async () => json({}, 503));
    await expect(
      aicProvider.search('x', { locale: 'de', fetch: fetch as never }),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});

describe('places', () => {
  it('maps photon cities', () => {
    const vienna = mapPhotonFeature(
      (photonCities as never as { features: never[] }).features[0]!,
      false,
    );
    expect(vienna).toMatchObject({
      name: 'Wien',
      countryCode: 'AT',
      osmId: 'relation/109166',
      coords: { lat: 48.2083537, lng: 16.3725042 },
    });
  });

  it('maps photon venues with address and kind', () => {
    const venue = mapPhotonFeature(
      {
        geometry: { coordinates: [16.3682605, 48.2046365] },
        properties: {
          osm_type: 'N',
          osm_id: 1,
          osm_key: 'tourism',
          osm_value: 'museum',
          name: 'Albertina',
          street: 'Albertinaplatz',
          housenumber: '1',
          postcode: '1010',
          city: 'Wien',
          countrycode: 'AT',
        },
      },
      true,
    );
    expect(venue).toMatchObject({
      venueKind: 'museum',
      city: 'Wien',
      address: 'Albertinaplatz 1, 1010 Wien',
    });
  });

  it('sends venue tag filters to photon', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request) => json({ features: [] }));
    await photonProvider.searchVenues('Louvre', { locale: 'de', fetch: fetch as never });
    const url = String(fetch.mock.calls[0]?.[0]);
    expect(url).toContain('osm_tag=tourism%3Amuseum');
    expect(url).not.toContain('osm_tag=tourism&');
  });

  it('ranks overpass results by notability', () => {
    const pois = mapOverpass(overpass.elements as never);
    expect(pois[0]?.name).toBeTruthy();
    expect(pois.find((p) => p.name === 'Albertina')?.kind).toBe('museum');
    for (let i = 1; i < pois.length; i++)
      expect(pois[i - 1]!.score).toBeGreaterThanOrEqual(pois[i]!.score);
  });

  it('derives the most specific venue kind', () => {
    expect(venueKindFromTags({ historic: 'castle', tourism: 'museum' })).toBe('museum');
    expect(venueKindFromTags({ historic: 'palace' })).toBe('castle');
    expect(venueKindFromTags({ tourism: 'attraction', amenity: 'place_of_worship' })).toBe(
      'church',
    );
    expect(venueKindFromTags({ amenity: 'cafe' })).toBe('other');
  });

  it('ignores disambiguation pages and missing articles', async () => {
    expect(mapSummary(wikipediaDisambiguation as never)).toBeUndefined();
    const fetch = vi.fn(async () => json({}, 404));
    expect(
      await wikipediaSummary('de', 'Gibtsnicht', { locale: 'de', fetch: fetch as never }),
    ).toBeUndefined();
  });
});

describe('wikimedia commons', () => {
  const filePath =
    'https://commons.wikimedia.org/wiki/Special:FilePath/Monet%20-%20Impression%2C%20Sunrise.jpg?width=1600';

  it('extracts file names only from Special:FilePath urls', () => {
    expect(commonsFileName(filePath)).toBe('Monet - Impression, Sunrise.jpg');
    expect(commonsFileName('https://example.org/a.jpg')).toBeUndefined();
  });

  it('resolves to the CORS-enabled thumbnail url', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request) =>
      json({
        query: {
          pages: {
            '1': { imageinfo: [{ thumburl: 'https://thumb.wikimedia.org/x/1600px-a.jpg' }] },
          },
        },
      }),
    );
    const url = await resolveCommonsImage(filePath, 1600, { locale: 'de', fetch: fetch as never });
    expect(url).toBe('https://thumb.wikimedia.org/x/1600px-a.jpg');
    expect(String(fetch.mock.calls[0]?.[0])).toContain('iiurlwidth=1600');
    expect(await resolveCommonsImage('https://example.org/a.jpg', 800, { locale: 'de' })).toBe(
      'https://example.org/a.jpg',
    );
  });
});

describe('wikidata search modes', () => {
  it('builds a creator query that matches people', () => {
    const q = buildWikidataQuery('Klimt', 'de', 'creator');
    expect(q).toContain('?creator wdt:P31 wd:Q5');
    expect(q).toContain('?item wdt:P170 ?creator');
  });

  it('merges title and creator results and survives one failing', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      decodeURIComponent(String(url)).includes('wd:Q5') ? json({}, 429) : json(wikidataSearch),
    );
    const results = await wikidataProvider.search('Sternennacht', {
      locale: 'de',
      fetch: fetch as never,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('overpass', () => {
  it('queries a bounding box around the centre', () => {
    const q = buildOverpassQuery(48.2083, 16.3725, 5000);
    expect(q).toContain('[bbox:48.1634,16.3051,48.2532,16.4399]');
  });

  it('takes the first endpoint that answers', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('private.coffee') ? json(overpass) : json({}, 504),
    );
    const pois = await overpassProvider.nearby({ lat: 48.2, lng: 16.37 }, 1000, {
      locale: 'de',
      fetch: fetch as never,
    });
    expect(pois.length).toBeGreaterThan(0);
  });
});

describe('people', () => {
  it('reads years from Wikidata time values', () => {
    expect(wikidataYear({ time: '+1632-10-00T00:00:00Z', precision: 10 })).toBe(1632);
    expect(wikidataYear({ time: '-0469-01-01T00:00:00Z', precision: 9 })).toBe(-469);
    expect(wikidataYear({ time: '+1500-00-00T00:00:00Z', precision: 7 })).toBeUndefined();
    expect(wikidataYear(undefined)).toBeUndefined();
  });

  it('maps humans and skips everything else', () => {
    type Entity = Parameters<typeof mapWikidataPerson>[0];
    const entity = (id: string) =>
      (wikidataPeopleEntities.entities as unknown as Record<string, Entity>)[id]!;
    expect(mapWikidataPerson(entity('Q19912259'), 'de')).toBeUndefined(); // family name
    expect(mapWikidataPerson(entity('Q115955446'), 'de')).toBeUndefined(); // exhibition
    expect(mapWikidataPerson(entity('Q41264'), 'de')).toMatchObject({
      wikidataId: 'Q41264',
      name: 'Jan Vermeer',
      description: 'holländischer Maler (1632–1675)',
      birthYear: 1632,
      deathYear: 1675,
      wikipedia: 'de:Jan Vermeer',
      url: 'https://www.wikidata.org/wiki/Q41264',
    });
    expect(mapWikidataPerson(entity('Q41264'), 'de')?.imageUrl).toMatch(
      /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/.+\?width=600$/,
    );
    // Falls back to the English article when there is none in the UI language.
    expect(mapWikidataPerson(entity('Q944834'), 'de')?.wikipedia).toMatch(/^en:/);
  });

  it('searches, then loads details in search order', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      json(
        String(url).includes('wbsearchentities') ? wikidataPeopleSearch : wikidataPeopleEntities,
      ),
    );
    const results = await wikidataPeopleProvider.search('Vermeer', {
      locale: 'de',
      fetch: fetch as never,
    });
    expect(String(fetch.mock.calls[0]?.[0])).toContain('origin=*');
    expect(results.map((r) => r.wikidataId)).toEqual(['Q41264', 'Q944834', 'Q3159680']);
  });
});
