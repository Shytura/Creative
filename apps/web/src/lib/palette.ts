import { colorDistance, rgbToHex } from '@mnemo/core';

/**
 * Extracts dominant colours from RGBA pixel data. Pixels are bucketed at 5 bits per channel,
 * buckets are ranked by population and near-duplicates are merged perceptually.
 */
export function extractPalette(data: Uint8ClampedArray, maxColors = 6): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < 128) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 64)
    .map((c) => rgbToHex({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n }));

  const palette: string[] = [];
  for (const color of ranked) {
    if (palette.every((p) => colorDistance(p, color) > 16)) palette.push(color);
    if (palette.length >= maxColors) break;
  }
  return palette;
}
