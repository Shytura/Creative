import { compact, fetchJson, httpsUrl, query, WIKIMEDIA_HEADERS } from '../http';
import type { ArtworkSearchProvider, ArtworkSearchResult } from '../types';

interface Binding {
  value: string;
}

interface SparqlResponse {
  results: {
    bindings: Array<
      Partial<
        Record<
          'item' | 'itemLabel' | 'creatorLabel' | 'image' | 'inception' | 'collectionLabel',
          Binding
        >
      >
    >;
  };
}

/** painting, sculpture, drawing, print, work of art, fresco */
const ARTWORK_TYPES = ['Q3305213', 'Q860861', 'Q93184', 'Q11060274', 'Q838948', 'Q134194'];

/** Escapes a user query for use inside a SPARQL string literal. */
const literal = (value: string) => JSON.stringify(value);

/**
 * `title` finds artworks whose label matches the search; `creator` finds works by people
 * matching it, so "Klimt" returns his paintings and not just items named "Klimt".
 */
export function buildWikidataQuery(
  search: string,
  locale: string,
  mode: 'title' | 'creator' = 'title',
): string {
  const match =
    mode === 'title'
      ? `?item wdt:P18 ?image ; wdt:P31 ?type .
  VALUES ?type { ${ARTWORK_TYPES.map((t) => `wd:${t}`).join(' ')} }
  OPTIONAL { ?item wdt:P170 ?creator }`
      : `?creator wdt:P31 wd:Q5 .
  ?item wdt:P170 ?creator ; wdt:P18 ?image .`;
  return `SELECT ?item ?itemLabel ?creatorLabel ?image ?inception ?collectionLabel WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org";
                    wikibase:api "EntitySearch";
                    mwapi:search ${literal(search)};
                    mwapi:language "${locale}";
                    mwapi:limit "${mode === 'title' ? 50 : 5}".
    ?${mode === 'title' ? 'item' : 'creator'} wikibase:apiOutputItem mwapi:item.
  }
  ${match}
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P195 ?collection }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${locale},en,mul". }
} LIMIT 60`;
}

export function mapWikidata(response: SparqlResponse): ArtworkSearchResult[] {
  const byItem = new Map<string, ArtworkSearchResult>();
  for (const b of response.results.bindings) {
    const itemUrl = b.item?.value;
    const image = httpsUrl(b.image?.value);
    if (!itemUrl || !image || byItem.has(itemUrl)) continue;
    const qid = itemUrl.split('/').pop() ?? itemUrl;
    const title = b.itemLabel?.value;
    // Unlabelled items come back with their Q-id as label.
    if (!title || title === qid) continue;
    byItem.set(
      itemUrl,
      compact({
        provider: 'wikidata',
        externalId: qid,
        title,
        artist: b.creatorLabel?.value,
        year: b.inception?.value.match(/^-?\d+/)?.[0]?.replace(/^(-?)0+(?=\d)/, '$1'),
        museumName: b.collectionLabel?.value,
        imageUrl: `${image}?width=1600`,
        thumbnailUrl: `${image}?width=400`,
        url: `https://www.wikidata.org/wiki/${qid}`,
        credit: 'Wikimedia Commons',
      }),
    );
  }
  return [...byItem.values()];
}

export const wikidataProvider: ArtworkSearchProvider = {
  id: 'wikidata',
  name: 'Wikidata & Wikimedia Commons',
  homepage: 'https://www.wikidata.org/',
  async search(q, ctx) {
    const run = (mode: 'title' | 'creator') =>
      fetchJson<SparqlResponse>(
        'wikidata',
        `https://query.wikidata.org/sparql?${query({ query: buildWikidataQuery(q, ctx.locale, mode), format: 'json' })}`,
        ctx,
        {
          init: { headers: { Accept: 'application/sparql-results+json', ...WIKIMEDIA_HEADERS } },
          timeoutMs: 30_000,
        },
      );
    const [byTitle, byCreator] = await Promise.allSettled([run('title'), run('creator')]);
    if (byTitle.status === 'rejected' && byCreator.status === 'rejected') throw byTitle.reason;
    const bindings = [byTitle, byCreator].flatMap((r) =>
      r.status === 'fulfilled' ? r.value.results.bindings : [],
    );
    return mapWikidata({ results: { bindings } });
  },
};
