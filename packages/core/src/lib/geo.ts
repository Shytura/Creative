import type { Coords } from '../model/common';

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: Coords, b: Coords): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Items sorted by distance to `origin`, limited to `maxKm`. Items without coords are skipped. */
export function nearby<T extends { coords?: Coords | undefined }>(
  items: readonly T[],
  origin: Coords,
  maxKm: number,
): Array<T & { distanceKm: number }> {
  return items
    .flatMap((item) => {
      if (!item.coords) return [];
      const d = distanceKm(origin, item.coords);
      return d <= maxKm ? [{ ...item, distanceKm: d }] : [];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** `[[west, south], [east, north]]`, or null for an empty list. */
export function bounds(points: readonly Coords[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const p of points) {
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return [
    [w, s],
    [e, n],
  ];
}
