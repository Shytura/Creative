import {
  accentFromPalette,
  artworkOfTheDay,
  ensureContrast,
  onColor,
  todayIsoDate,
} from '@mnemo/core';
import { resolveLocale } from '@mnemo/i18n';
import { meshGradients, paperGrain } from '@mnemo/ui';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../lib/hooks';
import { useArtworks, useMediaUrl, useSettings } from '../data';

const PAPER = { light: '#f3eee5', dark: '#12110f' };

export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

/** The artwork of the day, shared by the Salon, the `auto` accent and the daily background. */
export function useArtworkOfTheDay() {
  const artworks = useArtworks();
  return useMemo(
    () =>
      artworkOfTheDay(
        (artworks ?? []).filter((a) => a.status === 'seen'),
        todayIsoDate(),
      ),
    [artworks],
  );
}

/** Applies theme, accent colour and language from the settings to the document. */
export function Appearance() {
  const settings = useSettings();
  const theme = useResolvedTheme();
  const daily = useArtworkOfTheDay();
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[theme]);
    try {
      localStorage.setItem('mnemo:theme', theme);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies for this session.
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const base =
      settings.accent === 'auto'
        ? (accentFromPalette(daily?.palette ?? [], PAPER[theme]) ?? '#a4462f')
        : settings.accent;
    const accent = ensureContrast(base, PAPER[theme], 4.5);
    root.style.setProperty('--mn-accent', accent);
    root.style.setProperty('--mn-accent-ink', onColor(accent));
  }, [settings.accent, daily, theme]);

  useEffect(() => {
    const locale = resolveLocale(settings.locale, navigator.language);
    if (i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [settings.locale, i18n]);

  return null;
}

/** Full-screen backdrop behind all content: paper, gradient mesh or a softened artwork. */
export function Background() {
  const settings = useSettings();
  const theme = useResolvedTheme();
  const daily = useArtworkOfTheDay();
  const bg = settings.background;
  const intensity = settings.backgroundIntensity;

  const mediaId =
    bg.kind === 'upload' ? bg.mediaId : bg.kind === 'daily' ? daily?.mediaIds[0] : undefined;
  const artworkMediaId = useArtworkMedia(bg.kind === 'artwork' ? bg.artworkId : undefined);
  const imageUrl = useMediaUrl(mediaId ?? artworkMediaId, 'full');

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper"
    >
      {bg.kind === 'mesh' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: meshGradients[bg.preset][theme],
            opacity: 0.55 + intensity * 0.45,
          }}
        />
      )}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full scale-110 object-cover blur-[60px] saturate-[1.15] transition-opacity duration-1000"
            style={{ opacity: 0.2 + intensity * 0.6 }}
          />
          <div className="absolute inset-0 bg-paper/55" />
        </>
      )}
      {bg.kind !== 'plain' && (
        <div
          className="absolute inset-0 opacity-80 mix-blend-multiply dark:opacity-40 dark:mix-blend-screen"
          style={{ backgroundImage: paperGrain }}
        />
      )}
    </div>
  );
}

function useArtworkMedia(artworkId: string | undefined) {
  const artworks = useArtworks();
  return artworkId ? artworks?.find((a) => a.id === artworkId)?.mediaIds[0] : undefined;
}
