import { accentFromPalette, onColor } from '@mnemo/core';
import { type CSSProperties, useMemo } from 'react';
import { useResolvedTheme } from '../app/shell/Appearance';

const PAPER = { light: '#f3eee5', dark: '#12110f' };

/** Lets a page borrow its accent colour from an image palette, readable on the current paper. */
export function usePaletteAccent(
  palette: readonly string[] | undefined,
): CSSProperties | undefined {
  const theme = useResolvedTheme();
  return useMemo(() => {
    const accent = accentFromPalette(palette ?? [], PAPER[theme]);
    return accent
      ? ({ '--mn-accent': accent, '--mn-accent-ink': onColor(accent) } as CSSProperties)
      : undefined;
  }, [palette, theme]);
}
