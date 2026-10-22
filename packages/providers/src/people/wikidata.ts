import { compact, fetchJson, query, WIKIMEDIA_HEADERS } from '../http';
import type { PeopleProvider, PersonResult, ProviderContext } from '../types';

interface SearchResponse {
  search?: Array<{ id: string; label?: string; description?: string }>;
}

interface Claim {
  mainsnak: { snaktype: string; datavalue?: { value: unknown } };
  rank: 'preferred' | 'normal' | 'deprecated';
}

interface Entity {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { site: string; title: string }>;
}

interface EntitiesResponse {
  entities?: Record<string, Entity>;
}

const HUMAN = 'Q5';
const API = 'https://www.wikidata.org/w/api.php';

/** Values of a property, preferred rank first, deprecated ones dropped. */
function values(entity: Entity, property: string): unknown[] {
  return (entity.claims?.[property] ?? [])
    .filter((c) => c.rank !== 'deprecated' && c.mainsnak.snaktype === 'value')
    .sort((a, b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'))
    .map((c) => c.mainsnak.datavalue?.value);
}

/** Year of a Wikidata time value such as `+1632-10-00T00:00:00Z`; negative for BCE. */
export function wikidataYear(value: unknown): number | undefined {
  const { time, precision } = (value ?? {}) as { time?: string; precision?: number };
  const match = time?.match(/^([+-])0*(\d+)-/);
  // Precision 9 is a year; coarser values (decade, century) would suggest false accuracy.
  if (!match?.[2] || (precision ?? 0) < 9) return undefined;
  return match[1] === '-' ? -Number(match[2]) : Number(match[2]);
}

function firstYear(entity: Entity, property: string): number | undefined {
  for (const v of values(entity, property)) {
    const year = wikidataYear(v);
    if (year !== undefined) return year;
  }
  return undefined;
}

/** Maps a Wikidata entity to a person, or undefined if it is not a human. */
export function mapWikidataPerson(entity: Entity, locale: string): PersonResult | undefined {
  if (entity.missing !== undefined) return undefined;
  const isHuman = values(entity, 'P31').some((v) => (v as { id?: string })?.id === HUMAN);
  const pick = (map?: Record<string, { value: string }>) =>
    (map?.[locale] ?? map?.en ?? map?.mul)?.value;
  const name = pick(entity.labels);
  if (!isHuman || !name) return undefined;

  const image = values(entity, 'P18').find((v): v is string => typeof v === 'string');
  const sitelink = entity.sitelinks?.[`${locale}wiki`] ?? entity.sitelinks?.enwiki;
  return compact({
    wikidataId: entity.id,
    name,
    description: pick(entity.descriptions),
    birthYear: firstYear(entity, 'P569'),
    deathYear: firstYear(entity, 'P570'),
    imageUrl: image
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image.replaceAll(' ', '_'))}?width=600`
      : undefined,
    wikipedia: sitelink ? `${sitelink.site.replace(/wiki$/, '')}:${sitelink.title}` : undefined,
    url: `https://www.wikidata.org/wiki/${entity.id}`,
  });
}

async function fetchEntities(ids: string[], ctx: ProviderContext): Promise<Entity[]> {
  const response = await fetchJson<EntitiesResponse>(
    'wikidata',
    `${API}?${query({
      action: 'wbgetentities',
      ids: ids.join('|'),
      props: 'labels|descriptions|claims|sitelinks',
      languages: `${ctx.locale}|en|mul`,
      sitefilter: `${ctx.locale}wiki|enwiki`,
      format: 'json',
      origin: '*',
    })}`,
    ctx,
    { init: { headers: WIKIMEDIA_HEADERS } },
  );
  return ids.flatMap((id) => response.entities?.[id] ?? []);
}

export const wikidataPeopleProvider: PeopleProvider = {
  id: 'wikidata',
  name: 'Wikidata',
  homepage: 'https://www.wikidata.org/',
  async search(q, ctx) {
    const response = await fetchJson<SearchResponse>(
      'wikidata',
      `${API}?${query({
        action: 'wbsearchentities',
        search: q,
        language: ctx.locale,
        uselang: ctx.locale,
        type: 'item',
        limit: 10,
        format: 'json',
        origin: '*',
      })}`,
      ctx,
      { init: { headers: WIKIMEDIA_HEADERS } },
    );
    const ids = (response.search ?? []).map((r) => r.id);
    if (ids.length === 0) return [];
    return (await fetchEntities(ids, ctx)).flatMap((e) => mapWikidataPerson(e, ctx.locale) ?? []);
  },
  async get(id, ctx) {
    const [entity] = await fetchEntities([id], ctx);
    return entity ? mapWikidataPerson(entity, ctx.locale) : undefined;
  },
};
