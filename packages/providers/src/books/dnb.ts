import { compact, fetchText, query } from '../http';
import type { BookSearchProvider, BookSearchResult } from '../types';
import { cleanSubtitle, firstIsbn, languageFromMarc, yearOf } from './common';

/**
 * Deutsche Nationalbibliothek: every book published in Germany, Austria and Switzerland, no
 * key needed. The SRU interface answers in XML; the Dublin Core records are flat, so a small
 * tag reader is enough and keeps the package free of a DOM dependency.
 */

type DcRecord = Map<string, string[]>;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X'))
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
    return ENTITIES[code] ?? match;
  });
}

/** Reads `<dc:*>` elements per record; identifiers are keyed by their type, e.g. `identifier:tel:ISBN`. */
export function parseDcRecords(xml: string): DcRecord[] {
  return [...xml.matchAll(/<record>([\s\S]*?)<\/record>/g)].map(([, body]) => {
    const record: DcRecord = new Map();
    for (const [, tag, attrs, value] of body!.matchAll(/<dc:(\w+)([^>]*)>([^<]*)<\/dc:\1>/g)) {
      const type = attrs!.match(/xsi:type="([^"]+)"/)?.[1];
      const key = tag === 'identifier' && type ? `identifier:${type}` : tag!;
      record.set(key, [...(record.get(key) ?? []), decode(value!).trim()]);
    }
    return record;
  });
}

/** `Mann, Thomas.` → `Thomas Mann`. */
function displayName(inverted: string): string {
  const name = inverted.replace(/\.$/, '').trim();
  const [last, first] = name.split(/,\s*/);
  return first ? `${first} ${last}` : name;
}

/** Authors are creators without a role or with the role `Verfasser`. */
function authorsOf(creators: readonly string[]): string[] {
  return creators.flatMap((c) => {
    const [, name, role] = c.match(/^(.*?)\s*(?:\[([^\]]+)\])?$/) ?? [];
    return name && (!role || role === 'Verfasser') ? [displayName(name)] : [];
  });
}

/**
 * `[Mann] ; Buddenbrooks : Verfall einer Familie : Roman / Thomas Mann ; …` → title
 * `Buddenbrooks`, subtitle `Verfall einer Familie : Roman`. The bracketed prefix is a uniform
 * title or sort key, everything after ` / ` the statement of responsibility.
 */
function splitTitle(raw: string): { title: string; subtitle?: string } {
  const main = raw.replace(/^\[[^\]]*\]\s*;\s*/, '').split(' / ')[0]!;
  const [title, ...rest] = main.split(' : ');
  return { title: title!.trim(), subtitle: cleanSubtitle(rest.join(' : ')) };
}

export function mapDnbRecord(record: DcRecord): BookSearchResult | undefined {
  const rawTitle = record.get('title')?.[0];
  const isbn = firstIsbn(record.get('identifier:tel:ISBN'));
  if (!rawTitle || !isbn) return undefined;
  const idn = record.get('identifier:dnb:IDN')?.[0];
  const pages = record
    .get('format')?.[0]
    ?.match(/(\d+)\s*(?:Seiten|S\.|pages?|p\.|sidor|pagine|páginas)/i)?.[1];
  return compact({
    provider: 'dnb',
    externalId: idn ?? isbn,
    ...splitTitle(rawTitle),
    authors: authorsOf(record.get('creator') ?? []),
    isbn,
    publisher: record.get('publisher')?.[0]?.split(' : ').pop(),
    year: yearOf(record.get('date')?.[0]),
    pageCount: pages ? Number(pages) : undefined,
    language: languageFromMarc(record.get('language')?.[0]),
    // Shown directly; the cover service does not allow downloads from other origins.
    coverUrl: `https://portal.dnb.de/opac/mvb/cover?isbn=${isbn}`,
    url: idn ? `https://d-nb.info/${idn}` : undefined,
  });
}

export function mapDnb(xml: string): BookSearchResult[] {
  return parseDcRecords(xml).flatMap((r) => mapDnbRecord(r) ?? []);
}

const sru = (cql: string) =>
  `https://services.dnb.de/sru/dnb?${query({
    version: '1.1',
    operation: 'searchRetrieve',
    query: cql,
    recordSchema: 'oai_dc',
    maximumRecords: 20,
  })}`;

/** Every word must match somewhere in the record; only printed books, no archive material. */
export function buildDnbQuery(q: string): string {
  const words = q
    .replace(/["=()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `WOE=${w}`);
  return [...words, 'mat=books'].join(' and ');
}

export const dnbProvider: BookSearchProvider = {
  id: 'dnb',
  name: 'Deutsche Nationalbibliothek',
  homepage: 'https://www.dnb.de/sru',
  storableCovers: false,
  async search(q, ctx) {
    return mapDnb(await fetchText('dnb', sru(buildDnbQuery(q)), ctx, { minIntervalMs: 250 }));
  },
  async byIsbn(isbn, ctx) {
    const xml = await fetchText('dnb', sru(`num=${isbn}`), ctx, { minIntervalMs: 250 });
    return mapDnb(xml).find((b) => b.isbn === isbn);
  },
};
