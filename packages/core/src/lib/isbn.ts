/** ISBN handling. Books are stored with ISBN-13; ISBN-10 is converted on input. */

function isbn10Valid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = digits[i]!;
    sum += (c === 'X' ? 10 : Number(c)) * (10 - i);
  }
  return sum % 11 === 0;
}

function isbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/**
 * Returns the ISBN-13 for an ISBN-10 or ISBN-13 in any common notation (hyphens, spaces,
 * `ISBN` prefix), or `undefined` when the input is not a valid ISBN.
 */
export function normalizeIsbn(input: string): string | undefined {
  const raw = input
    .toUpperCase()
    .replace(/^ISBN(-1[03])?:?/, '')
    .replace(/[\s-]/g, '');
  if (/^\d{9}[\dX]$/.test(raw)) {
    if (!isbn10Valid(raw)) return undefined;
    const first12 = `978${raw.slice(0, 9)}`;
    return `${first12}${isbn13CheckDigit(first12)}`;
  }
  if (/^97[89]\d{10}$/.test(raw)) {
    return isbn13CheckDigit(raw.slice(0, 12)) === Number(raw[12]) ? raw : undefined;
  }
  return undefined;
}

export const isValidIsbn = (input: string) => normalizeIsbn(input) !== undefined;
