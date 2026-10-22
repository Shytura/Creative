import i18next, { type i18n as I18n, type Module } from 'i18next';
import { de } from './de';
import { en } from './en';

export { de, en };
export type Dictionary = typeof de;

export const resources = {
  de: { translation: de },
  en: { translation: en },
} as const;

export const supportedLocales = ['de', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];

/** Resolves the `system` preference against the browser language. */
export function resolveLocale(preference: 'system' | Locale, browserLanguage = 'de'): Locale {
  if (preference !== 'system') return preference;
  return browserLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

/** Creates an isolated i18next instance so Mnemo never clashes with a host app's instance. */
export function createI18n(lng: Locale, plugins: Module[] = []): I18n {
  const instance = i18next.createInstance();
  for (const plugin of plugins) instance.use(plugin);
  void instance.init({
    lng,
    fallbackLng: 'de',
    supportedLngs: supportedLocales,
    resources,
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}
