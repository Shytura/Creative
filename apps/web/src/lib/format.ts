import { useTranslation } from 'react-i18next';

/** Locale-aware formatters bound to the current UI language. */
export function useFormat() {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'de';

  const date = (
    iso: string | undefined,
    style: 'long' | 'medium' | 'dayMonth' | 'monthYear' = 'long',
  ) => {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    const options: Intl.DateTimeFormatOptions =
      style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : style === 'medium'
          ? { day: 'numeric', month: 'short', year: 'numeric' }
          : style === 'dayMonth'
            ? { day: 'numeric', month: 'long' }
            : { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat(locale, options).format(d);
  };

  const number = (n: number) => new Intl.NumberFormat(locale).format(n);

  const bytes = (n: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = n;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
  };

  const country = (code: string | undefined, fallback = '') => {
    if (!code) return fallback;
    try {
      return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? fallback;
    } catch {
      return fallback;
    }
  };

  /** `1632–1675`, `* 1940`, `† 1528`; negative years are BCE. */
  const lifespan = ({ birthYear: b, deathYear: d }: { birthYear?: number; deathYear?: number }) => {
    const year = (y: number) => (y < 0 ? `${-y} ${t('creator.bce')}` : String(y));
    if (b !== undefined && d !== undefined) return `${year(b)}–${year(d)}`;
    if (b !== undefined) return `* ${year(b)}`;
    if (d !== undefined) return `† ${year(d)}`;
    return '';
  };

  return { locale, date, number, bytes, country, lifespan };
}

/** Roman numerals for the editorial section numbering. */
export function roman(n: number): string {
  const map: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let rest = n;
  let out = '';
  for (const [value, symbol] of map) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}
