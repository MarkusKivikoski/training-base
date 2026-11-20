import type { LngLat } from './climbs.js';

/**
 * When two outdoor rides count as the same route: the same roads from start to finish, in the
 * same direction (like Strava's matched rides). Each route is reduced to the grid cells it passes
 * through; two routes match when nearly every cell of each lies on or next to a cell of the other.
 *
 * Checked against 327 outdoor rides on 2026-11-16: 27 routes ridden more than once (98 rides),
 * with the two directions of the same commute kept apart.
 */
export const ROUTE_MATCH_RULES = {
  /** Side of one grid cell, metres. A neighbouring cell also counts, so GPS drift doesn't break a match. */
  cellM: 75,
  /** Share of each route's cells that must lie on or next to the other route. */
  minCoverage: 0.9,
  /** Rides whose distances differ by more than this share of the reference are different routes. */
  maxDistanceDifference: 0.05,
  /** Share of shared cells that must come in the same order: near 1 the same way round, near 0 the other way. */
  minSameOrder: 0.7,
} as const;

export type RouteMatchRules = { [K in keyof typeof ROUTE_MATCH_RULES]: number };

const METRES_PER_DEG_LAT = 111_320;
const DEG = Math.PI / 180;

const cellKey = (x: number, y: number) => `${x}:${y}`;

export interface RouteSignature {
  /** Grid cells the route passes through, each once, in the order it first enters them. */
  cells: ReadonlyArray<readonly [number, number]>;
  keys: ReadonlySet<string>;
}

/**
 * The grid cells a route passes through. The grid is fixed to the globe (cell width follows the
 * latitude rounded to a whole degree), so every ride on the same road lands in the same cells.
 * Segments are walked in half-cell steps, since the stored polylines are simplified.
 */
export function routeSignature(points: readonly LngLat[], rules: Partial<RouteMatchRules> = {}): RouteSignature {
  const { cellM } = { ...ROUTE_MATCH_RULES, ...rules };
  const cells: Array<readonly [number, number]> = [];
  const keys = new Set<string>();

  const visit = (lng: number, lat: number) => {
    const metresPerDegLng = METRES_PER_DEG_LAT * Math.cos(Math.round(lat) * DEG);
    const x = Math.floor((lng * metresPerDegLng) / cellM);
    const y = Math.floor((lat * METRES_PER_DEG_LAT) / cellM);
    const key = cellKey(x, y);
    if (keys.has(key)) return;
    keys.add(key);
    cells.push([x, y]);
  };

  let previous: LngLat | null = null;
  for (const point of points) {
    const from: LngLat = previous ?? point;
    const metresPerDegLng = METRES_PER_DEG_LAT * Math.cos(point[1] * DEG);
    const lengthM = Math.hypot((point[0] - from[0]) * metresPerDegLng, (point[1] - from[1]) * METRES_PER_DEG_LAT);
    const steps = Math.max(1, Math.ceil(lengthM / (cellM / 2)));
    for (let step = 1; step <= steps; step++) {
      const share = step / steps;
      visit(from[0] + (point[0] - from[0]) * share, from[1] + (point[1] - from[1]) * share);
    }
    previous = point;
  }
  return { cells, keys };
}

/** Share of `route`'s cells that lie on a cell of `other` or one of its eight neighbours. */
function coveredShare(route: RouteSignature, other: RouteSignature): number {
  if (route.cells.length === 0) return 0;
  let covered = 0;
  for (const [x, y] of route.cells) {
    let isNear = false;
    for (let dx = -1; dx <= 1 && !isNear; dx++) {
      for (let dy = -1; dy <= 1 && !isNear; dy++) {
        isNear = other.keys.has(cellKey(x + dx, y + dy));
      }
    }
    if (isNear) covered++;
  }
  return covered / route.cells.length;
}

/** How well two routes cover each other: the smaller of the two covered shares (0–1). */
export function routeCoverage(a: RouteSignature, b: RouteSignature): number {
  return Math.min(coveredShare(a, b), coveredShare(b, a));
}

/**
 * Share of the cells both routes pass through that `a` and `b` enter in the same order: near 1
 * when they go the same way round, near 0 the opposite way. 0 when they share fewer than two cells.
 */
export function sameOrderShare(a: RouteSignature, b: RouteSignature): number {
  const orderInB = new Map<string, number>();
  b.cells.forEach(([x, y], index) => orderInB.set(cellKey(x, y), index));

  const sharedOrder: number[] = [];
  for (const [x, y] of a.cells) {
    const index = orderInB.get(cellKey(x, y));
    if (index !== undefined) sharedOrder.push(index);
  }
  if (sharedOrder.length < 2) return 0;

  let inOrder = 0;
  for (let i = 1; i < sharedOrder.length; i++) {
    if (sharedOrder[i]! > sharedOrder[i - 1]!) inOrder++;
  }
  return inOrder / (sharedOrder.length - 1);
}

export interface RouteRide {
  signature: RouteSignature;
  distanceM: number;
}

/**
 * How well `other` covers the route of `earlier` when it is the same route (similar distance, the
 * same roads, the same way round); null when it is a different route.
 */
export function sameRouteCoverage(
  earlier: RouteRide,
  other: RouteRide,
  rules: Partial<RouteMatchRules> = {},
): number | null {
  const { minCoverage, maxDistanceDifference, minSameOrder } = { ...ROUTE_MATCH_RULES, ...rules };
  if (earlier.distanceM <= 0) return null;
  const distanceDifference = Math.abs(other.distanceM - earlier.distanceM) / earlier.distanceM;
  if (distanceDifference > maxDistanceDifference) return null;

  const coverage = routeCoverage(earlier.signature, other.signature);
  if (coverage < minCoverage) return null;
  const isSameWayRound = sameOrderShare(earlier.signature, other.signature) >= minSameOrder;
  return isSameWayRound ? coverage : null;
}

/** Whether `other` rode the same route as `earlier`: similar distance, the same roads, the same way round. */
export function isSameRoute(earlier: RouteRide, other: RouteRide, rules: Partial<RouteMatchRules> = {}): boolean {
  return sameRouteCoverage(earlier, other, rules) !== null;
}

export interface RouteGroup<T> {
  /** The first ride of the route; the route is named after it. */
  reference: T;
  /** Every ride of the route in input order, the reference first. */
  members: T[];
}

/**
 * Groups rides that follow the same route. A ride joins a group when it is the same route as any
 * ride already in it, picking the group with the best-covering ride, or starts a new group.
 * Comparing with every earlier ride, not only the first, keeps a route together when its first
 * ride took a small detour (seen 2026-11-16: two rides covering each other 99 % were split
 * because one covered the route's first ride only 89 %). Order the input oldest first so a route
 * keeps the reference of the first time it was ridden.
 */
export function groupRoutes<T extends RouteRide>(
  rides: readonly T[],
  rules: Partial<RouteMatchRules> = {},
): Array<RouteGroup<T>> {
  const groups: Array<RouteGroup<T>> = [];
  for (const ride of rides) {
    let closest: { group: RouteGroup<T>; coverage: number } | null = null;
    for (const group of groups) {
      for (const member of group.members) {
        const coverage = sameRouteCoverage(member, ride, rules);
        if (coverage === null) continue;
        if (closest === null || coverage > closest.coverage) closest = { group, coverage };
      }
    }
    if (closest) closest.group.members.push(ride);
    else groups.push({ reference: ride, members: [ride] });
  }
  return groups;
}
