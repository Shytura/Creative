/**
 * User-facing release notes shown in "What's new" and under Settings → About. Newest first.
 * The first entry must match the version in `apps/web/package.json` (checked by a test).
 * Developer-facing details belong in the root `CHANGELOG.md`.
 */

export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface ChangeEntry {
  kind: ChangeKind;
  de: string;
  en: string;
}

export interface Release {
  version: string;
  /** `YYYY-MM-DD` */
  date: string;
  entries: ChangeEntry[];
}

export const releases: readonly Release[] = [
  {
    version: '0.3.0',
    date: '2026-10-22',
    entries: [
      {
        kind: 'new',
        de: 'Künstler:innen haben eine eigene Seite mit Lebensdaten und allen ihren Werken in deiner Sammlung. Ein Klick auf den Namen unter einem Werk führt dorthin.',
        en: 'Artists have their own page with life dates and all their works in your collection. Click the name below a work to get there.',
      },
      {
        kind: 'new',
        de: 'Mit Wikidata verknüpfen: Porträt, Lebensdaten und der Wikipedia-Artikel werden übernommen.',
        en: 'Link to Wikidata to bring in portrait, life dates and the Wikipedia article.',
      },
      {
        kind: 'improved',
        de: 'Deine bisherigen Werke wurden automatisch ihren Künstler:innen zugeordnet. Die Zuschreibung bleibt so, wie du sie eingetragen hast, z. B. „Werkstatt des Rubens“.',
        en: 'Your existing works were linked to their artists automatically. The attribution stays as you entered it, e.g. “Workshop of Rubens”.',
      },
      {
        kind: 'improved',
        de: 'Die Bilanz verlinkt die meistgesehenen Künstler:innen direkt auf ihre Seiten.',
        en: 'Insights link your most-seen artists straight to their pages.',
      },
      {
        kind: 'fixed',
        de: 'Bilanz und Einstellungen passen auf dem Handy wieder in die Bildschirmbreite.',
        en: 'Insights and settings fit the screen width on phones again.',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-22',
    entries: [
      {
        kind: 'new',
        de: 'Nach einem Update zeigt Mnemo, was neu ist. Den ganzen Verlauf findest du unter Einstellungen → Über Mnemo.',
        en: 'After an update Mnemo shows what is new. The full history lives under Settings → About Mnemo.',
      },
      {
        kind: 'improved',
        de: 'Listen sind bereit für weitere Arten von Einträgen – als Vorbereitung auf eine persönliche Bibliothek.',
        en: 'Lists are ready for other kinds of entries, paving the way for a personal library.',
      },
      {
        kind: 'improved',
        de: 'Geht doch einmal etwas schief, erscheint eine eigene Fehlerseite, von der aus du sofort eine Sicherung laden kannst.',
        en: 'If something does go wrong, a dedicated error page lets you download a backup right away.',
      },
      {
        kind: 'improved',
        de: 'Datenquellen, die einen API-Schlüssel brauchen, erscheinen automatisch in den Einstellungen.',
        en: 'Data sources that need an API key now appear in the settings automatically.',
      },
      {
        kind: 'fixed',
        de: 'Sicherungen speichern Bilder in ihrem tatsächlichen Dateiformat.',
        en: 'Backups store images in their actual file format.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-21',
    entries: [
      {
        kind: 'new',
        de: 'Die erste Ausgabe: Salon, Sammlung, Atlas, Chronik, Planer, Entdecken und Bilanz – alles lokal in deinem Browser.',
        en: 'The first edition: Salon, Collection, Atlas, Journal, Planner, Discover and Insights – all stored locally in your browser.',
      },
    ],
  },
];

/** Compares dotted numeric versions; returns a negative number when `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Releases newer than `version`, newest first. */
export function releasesSince(version: string): Release[] {
  return releases.filter((r) => compareVersions(r.version, version) > 0);
}
