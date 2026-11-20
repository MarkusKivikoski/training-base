export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/**
 * Douglas-Peucker simplification of a [lng, lat] polyline, with distances in metres on
 * a local equirectangular projection (accurate enough at ride scale). Iterative, so
 * long rides can't overflow the stack. Output coordinates are rounded to 6 decimals.
 */
export function simplifyRoute(points: readonly LngLat[], epsilonM = 5): LngLat[] {
  if (points.length <= 2) return points.map(roundPoint);

  const meanLat = points.reduce((n, p) => n + p[1], 0) / points.length;
  const kx = Math.cos(meanLat * DEG) * DEG * EARTH_RADIUS_M;
  const ky = DEG * EARTH_RADIUS_M;
  const xy = points.map(([lng, lat]) => [lng * kx, lat * ky] as const);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    const [ax, ay] = xy[start]!;
    const [bx, by] = xy[end]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxDist = -1;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = xy[i]!;
      let d: number;
      if (len2 === 0) {
        d = Math.hypot(px - ax, py - ay);
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx !== -1 && maxDist > epsilonM) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1).map(roundPoint);
}

function roundPoint([lng, lat]: LngLat): LngLat {
  return [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6];
}

/** [lng, lat] pairs from stream channels, skipping seconds without a position. */
export function routeFromStream(
  lat: readonly (number | null)[] | null,
  lng: readonly (number | null)[] | null,
): LngLat[] {
  if (!lat || !lng) return [];
  const out: LngLat[] = [];
  for (let i = 0; i < lat.length; i++) {
    const a = lat[i];
    const o = lng[i];
    if (typeof a === 'number' && typeof o === 'number') out.push([o, a]);
  }
  return out;
}
