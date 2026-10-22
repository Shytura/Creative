export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return { r: channel(hue + 1 / 3) * 255, g: channel(hue) * 255, b: channel(hue - 1 / 3) * 255 };
}

function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Shifts lightness of `fg` until it reaches `min` contrast against `bg`. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const hsl = rgbToHsl(hexToRgb(fg));
  const darken = luminance(bg) > 0.4;
  for (let i = 0; i < 50; i++) {
    hsl.l = clamp(hsl.l + (darken ? -0.02 : 0.02), 0, 1);
    const candidate = rgbToHex(hslToRgb(hsl));
    if (contrastRatio(candidate, bg) >= min || hsl.l === 0 || hsl.l === 1) return candidate;
  }
  return rgbToHex(hslToRgb(hsl));
}

/** Readable text colour (near-black or near-white) on top of `bg`. */
export function onColor(bg: string): string {
  return contrastRatio('#16130f', bg) >= contrastRatio('#fbf8f3', bg) ? '#16130f' : '#fbf8f3';
}

function rgbToLab({ r, g, b }: Rgb): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Perceptual colour distance (CIE76). ~2 is barely noticeable, >40 clearly different. */
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a));
  const [l2, a2, b2] = rgbToLab(hexToRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function paletteMatches(palette: readonly string[], target: string, maxDistance = 28) {
  return palette.some((c) => colorDistance(c, target) <= maxDistance);
}

/** Picks the most characterful colour of a palette and makes it usable as UI accent. */
export function accentFromPalette(palette: readonly string[], background: string): string | null {
  let best: { hex: string; score: number } | null = null;
  palette.forEach((hex, index) => {
    const { s, l } = rgbToHsl(hexToRgb(hex));
    const score = s * (1 - Math.abs(l - 0.5) * 1.2) - index * 0.04;
    if (!best || score > best.score) best = { hex, score };
  });
  const chosen = best as { hex: string; score: number } | null;
  if (!chosen || chosen.score < 0.12) return null;
  return ensureContrast(chosen.hex, background, 4.5);
}

export function sortByHue(colors: readonly string[]): string[] {
  return [...colors]
    .map((hex) => ({ hex, hsl: rgbToHsl(hexToRgb(hex)) }))
    .sort((a, b) => {
      const greyA = a.hsl.s < 0.12;
      const greyB = b.hsl.s < 0.12;
      if (greyA !== greyB) return greyA ? 1 : -1;
      return greyA ? a.hsl.l - b.hsl.l : a.hsl.h - b.hsl.h;
    })
    .map((c) => c.hex);
}
