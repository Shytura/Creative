export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Today as `YYYY-MM-DD` in local time. */
export function todayIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First plausible year in a free-form museum date such as `c. 1868–73` or `um 1500`. */
export function parseYear(display: string | undefined): number | undefined {
  if (!display) return undefined;
  const match = display.match(/(-?\d{3,4})/);
  if (!match?.[1]) return undefined;
  let year = Number(match[1]);
  if (/\b(BCE?|v\.\s?Chr)/i.test(display)) year = -Math.abs(year);
  return year;
}

/** Regional indicator emoji for an ISO alpha-2 code. */
export function flagEmoji(countryCode: string | undefined): string {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) return '🏳️';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Deterministic 32-bit hash, used for "of the day" picks. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function groupBy<T, K extends string | number>(items: readonly T[], key: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
