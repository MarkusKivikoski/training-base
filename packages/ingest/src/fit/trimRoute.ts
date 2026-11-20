import type { LngLat } from './simplifyRoute.js';

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;
const CUT_TOLERANCE_M = 0.01;

/** Great-circle distance in metres between two [lng, lat] points. */
export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * DEG;
  const dLng = (b[0] - a[0]) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [
  Math.round((a[0] + (b[0] - a[0]) * t) * 1e6) / 1e6,
  Math.round((a[1] + (b[1] - a[1]) * t) * 1e6) / 1e6,
];

/**
 * Privacy trim: drops the first and last `trimM` metres of a route (measured along it)
 * and interpolates the new end points inside the cut segments. Returns [] when the route
 * is not longer than 2 × trimM, and a copy when trimM is 0.
 */
export function trimRoute(points: readonly LngLat[], trimM: number): LngLat[] {
  if (trimM <= 0) return points.map((p) => [p[0], p[1]]);
  if (points.length < 2) return [];

  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1]! + haversineM(points[i - 1]!, points[i]!));
  const total = cum.at(-1)!;
  if (total <= 2 * trimM) return [];

  const pointAt = (d: number): LngLat => {
    let i = 1;
    while (i < cum.length - 1 && cum[i]! < d) i++;
    const seg = cum[i]! - cum[i - 1]!;
    return lerp(points[i - 1]!, points[i]!, seg === 0 ? 0 : (d - cum[i - 1]!) / seg);
  };

  const start = trimM;
  const end = total - trimM;
  const out: LngLat[] = [pointAt(start)];
  for (let i = 0; i < points.length; i++) {
    // The tolerance keeps a point that sits on a cut (within float error) from appearing twice.
    if (cum[i]! > start + CUT_TOLERANCE_M && cum[i]! < end - CUT_TOLERANCE_M) out.push([points[i]![0], points[i]![1]]);
  }
  out.push(pointAt(end));
  return out;
}
