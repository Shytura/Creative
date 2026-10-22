import { normalizeIsbn } from '@mnemo/core';

/** MARC language codes (used by library catalogues) to ISO 639-1 for the common ones. */
const MARC_LANGUAGES: Record<string, string> = {
  ger: 'de',
  deu: 'de',
  eng: 'en',
  fre: 'fr',
  fra: 'fr',
  ita: 'it',
  spa: 'es',
  por: 'pt',
  dut: 'nl',
  nld: 'nl',
  swe: 'sv',
  dan: 'da',
  nor: 'no',
  fin: 'fi',
  pol: 'pl',
  cze: 'cs',
  rus: 'ru',
  gre: 'el',
  lat: 'la',
  tur: 'tr',
  jpn: 'ja',
  chi: 'zh',
};

export function languageFromMarc(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return lower.length === 2 ? lower : MARC_LANGUAGES[lower];
}

/** First valid ISBN of a list, as ISBN-13; ISBN-13 entries win over ISBN-10. */
export function firstIsbn(candidates: readonly string[] | undefined): string | undefined {
  const valid = (candidates ?? []).flatMap((c) => {
    const isbn = normalizeIsbn(c.trim().split(/\s/)[0] ?? '');
    return isbn ? [{ isbn, long: c.replace(/\D/g, '').length >= 13 }] : [];
  });
  return (valid.find((v) => v.long) ?? valid[0])?.isbn;
}

/** The four-digit year in a free-form publication date such as `March 2003`. */
export function yearOf(date: string | number | undefined): string | undefined {
  return date === undefined ? undefined : String(date).match(/\d{4}/)?.[0];
}

/** Catalogues separate subtitle parts with ` : ` (ISBD); readers expect `Part. Part`. */
export function cleanSubtitle(subtitle: string | undefined): string | undefined {
  return subtitle?.replace(/\s+[:;]\s+/g, '. ').trim() || undefined;
}
