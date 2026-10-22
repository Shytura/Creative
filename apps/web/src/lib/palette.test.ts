import { colorDistance } from '@mnemo/core';
import { describe, expect, it } from 'vitest';
import { extractPalette } from './palette';

function pixels(colors: Array<[number, number, number, number]>, counts: number[]) {
  const total = counts.reduce((a, b) => a + b, 0);
  const data = new Uint8ClampedArray(total * 4);
  let offset = 0;
  colors.forEach((c, i) => {
    for (let n = 0; n < (counts[i] ?? 0); n++) {
      data.set(c, offset);
      offset += 4;
    }
  });
  return data;
}

describe('extractPalette', () => {
  it('orders colours by dominance', () => {
    const palette = extractPalette(
      pixels(
        [
          [20, 40, 160, 255],
          [200, 60, 30, 255],
        ],
        [300, 900],
      ),
    );
    expect(colorDistance(palette[0]!, '#c83c1e')).toBeLessThan(5);
    expect(colorDistance(palette[1]!, '#1428a0')).toBeLessThan(5);
  });

  it('merges near-identical shades and ignores transparent pixels', () => {
    const palette = extractPalette(
      pixels(
        [
          [200, 60, 30, 255],
          [203, 62, 33, 255],
          [0, 255, 0, 0],
        ],
        [500, 500, 2000],
      ),
    );
    expect(palette).toHaveLength(1);
  });
});
