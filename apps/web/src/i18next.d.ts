import type { Dictionary } from '@mnemo/i18n';

// Type-checks every `t('…')` key against the German source dictionary.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Dictionary };
  }
}
