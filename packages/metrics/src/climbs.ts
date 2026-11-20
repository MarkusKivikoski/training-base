import { MAX_PLAUSIBLE_SPEED_MPS } from './records.js';

/** [lng, lat] */
export type LngLat = [number, number];

/** The stream channels climb detection and matching need (a subset of a ride's stream). */
export interface ClimbStreamInput {
  time: readonly number[];
  distance: readonly (number | null)[] | null;
  altitude: readonly (number | null)[] | null;
  lat: readonly (number | null)[] | null;
  lng: readonly (number | null)[] | null;
}

export interface DetectedClimb {
  /** Seconds since the start of the ride. */
  startS: number;
  endS: number;
  /** Distance into the ride where the climb starts, metres. */
  startDistM: number;
  lengthM: number;
  /** Net elevation gain, bottom to top, metres. */
  gainM: number;
  /** Fraction (0.05 = 5 %). */
  avgGrade: number;
  /** Steepest 100 m, fraction. */
  maxGrade: number;
  /** Strava-style climb score: length (m) × average grade (%). */
  score: number;
  start: LngLat;
  end: LngLat;
}

/** What counts as a climb. Tuned for small Nordic hills: 15 m of gain at 3 % or steeper. */
export const CLIMB_RULES = {
  minGainM: 15,
  minLengthM: 300,
  minAvgGrade: 0.03,
  /** Resampling step along the road, metres. */
  stepM: 10,
  /** Altitude smoothing, ± metres. */
  smoothM: 50,
  /** A drop of more than max(maxDropM, dropFraction × gain so far) below the top ends a climb. */
  maxDropM: 10,
  dropFraction: 0.2,
  /** This far without a new high point ends a climb. */
  maxFlatM: 500,
  /** Lead-in and run-out flatter than this over `edgeM` are trimmed off. */
  edgeGrade: 0.02,
  edgeM: 100,
} as const;

const DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

/** Distance between two points, metres (equirectangular, accurate at ride scale). */
export function metresBetween(a: LngLat, b: LngLat): number {
  const kx = Math.cos(((a[1] + b[1]) / 2) * DEG);
  return Math.hypot((b[0] - a[0]) * kx, b[1] - a[1]) * DEG * EARTH_RADIUS_M;
}

/** Cumulative distance per stream index with GPS glitches dropped (see cleanDistance); null where unknown. */
function cumulativeDistance(time: readonly number[], distance: readonly (number | null)[]): (number | null)[] {
  const out: (number | null)[] = [];
  let total = 0;
  let prevRaw: number | null = null;
  let prevT = 0;
  for (let i = 0; i < time.length; i++) {
    const v = distance[i];
    if (v === null || v === undefined) {
      out.push(null);
      continue;
    }
    if (prevRaw !== null) {
      const inc = v - prevRaw;
      if (inc > 0 && inc <= MAX_PLAUSIBLE_SPEED_MPS * Math.max(time[i]! - prevT, 1)) total += inc;
    }
    prevRaw = v;
    prevT = time[i]!;
    out.push(total);
  }
  return out;
}

const point = (s: ClimbStreamInput, i: number): LngLat | null => {
  const lng = s.lng?.[i];
  const lat = s.lat?.[i];
  return lng == null || lat == null ? null : [lng, lat];
};

/** Nearest index (searching outwards from `i`) that has a GPS fix. */
function nearestPoint(s: ClimbStreamInput, i: number): LngLat | null {
  for (let k = 0; k < 30; k++) {
    const p = point(s, i + k) ?? point(s, i - k);
    if (p) return p;
  }
  return null;
}

interface Grid {
  /** Distance along the road, metres. */
  d: number[];
  alt: number[];
  t: number[];
  /** Stream index at or just before each grid point. */
  idx: number[];
}

/** Altitude, time and stream index every `stepM` metres along the ride. */
function resample(s: ClimbStreamInput, stepM: number): Grid | null {
  if (!s.distance || !s.altitude) return null;
  const dist = cumulativeDistance(s.time, s.distance);
  const samples: Array<{ d: number; alt: number; t: number; i: number }> = [];
  for (let i = 0; i < s.time.length; i++) {
    const d = dist[i];
    const alt = s.altitude[i];
    if (d === null || d === undefined || alt === null || alt === undefined) continue;
    samples.push({ d, alt, t: s.time[i]!, i });
  }
  if (samples.length < 2) return null;
  const grid: Grid = { d: [], alt: [], t: [], idx: [] };
  let k = 0;
  for (let g = 0; g <= samples.at(-1)!.d; g += stepM) {
    while (k < samples.length - 2 && samples[k + 1]!.d <= g) k++;
    const a = samples[k]!;
    const b = samples[k + 1]!;
    const f = b.d > a.d ? Math.min(1, Math.max(0, (g - a.d) / (b.d - a.d))) : 0;
    grid.d.push(g);
    grid.alt.push(a.alt + (b.alt - a.alt) * f);
    grid.t.push(a.t + (b.t - a.t) * f);
    grid.idx.push(f < 0.5 ? a.i : b.i);
  }
  return grid;
}

function smooth(values: readonly number[], half: number): number[] {
  const prefix = [0];
  for (const v of values) prefix.push(prefix.at(-1)! + v);
  return values.map((_, i) => {
    const a = Math.max(0, i - half);
    const b = Math.min(values.length - 1, i + half);
    return (prefix[b + 1]! - prefix[a]!) / (b - a + 1);
  });
}

/**
 * Climbs in a ride, from its altitude and distance streams: stretches that gain at least
 * `minGainM` at `minAvgGrade` or steeper over `minLengthM` or more. Altitude is resampled every
 * 10 m along the road and smoothed over ±50 m; a climb ends at its top once the road drops
 * clearly below it or stays flat for 500 m, and flat lead-ins and run-outs are trimmed off.
 */
export function detectClimbs(s: ClimbStreamInput, rules: Partial<typeof CLIMB_RULES> = {}): DetectedClimb[] {
  const r = { ...CLIMB_RULES, ...rules };
  const grid = resample(s, r.stepM);
  if (!grid || !s.lat || !s.lng) return [];
  const alt = smooth(grid.alt, Math.round(r.smoothM / r.stepM));
  const n = alt.length;
  const edge = Math.max(1, Math.round(r.edgeM / r.stepM));
  const out: DetectedClimb[] = [];

  const emit = (lo: number, hi: number) => {
    // Trim flat (or falling) lead-ins and run-outs.
    while (hi - lo > edge && (alt[Math.min(lo + edge, hi)]! - alt[lo]!) / (edge * r.stepM) < r.edgeGrade) lo++;
    while (hi - lo > edge && (alt[hi]! - alt[Math.max(hi - edge, lo)]!) / (edge * r.stepM) < r.edgeGrade) hi--;
    const lengthM = grid.d[hi]! - grid.d[lo]!;
    const gainM = alt[hi]! - alt[lo]!;
    if (lengthM < r.minLengthM || gainM < r.minGainM || gainM / lengthM < r.minAvgGrade) return;
    let maxGrade = 0;
    for (let j = lo; j + edge <= hi; j++) maxGrade = Math.max(maxGrade, (alt[j + edge]! - alt[j]!) / (edge * r.stepM));
    const start = nearestPoint(s, grid.idx[lo]!);
    const end = nearestPoint(s, grid.idx[hi]!);
    if (!start || !end) return;
    const avgGrade = gainM / lengthM;
    out.push({
      startS: Math.round(grid.t[lo]!),
      endS: Math.round(grid.t[hi]!),
      startDistM: Math.round(grid.d[lo]!),
      lengthM: Math.round(lengthM),
      gainM: Math.round(gainM * 10) / 10,
      avgGrade: Math.round(avgGrade * 10000) / 10000,
      maxGrade: Math.round(Math.max(maxGrade, avgGrade) * 10000) / 10000,
      score: Math.round(lengthM * avgGrade * 100),
      start,
      end,
    });
  };

  let lo = 0;
  let hi = 0;
  for (let i = 1; i < n; i++) {
    if (alt[i]! <= alt[lo]!) {
      // Still going down (or a dip below the bottom): the climb, if any, starts here.
      if (hi > lo) emit(lo, hi);
      lo = i;
      hi = i;
      continue;
    }
    if (alt[i]! > alt[hi]!) {
      hi = i;
      continue;
    }
    const gain = alt[hi]! - alt[lo]!;
    const dropped = alt[hi]! - alt[i]! > Math.max(r.maxDropM, r.dropFraction * gain);
    const flat = grid.d[i]! - grid.d[hi]! > r.maxFlatM;
    if (dropped || flat) {
      emit(lo, hi);
      // Look for the next climb from the lowest point since the top.
      let low = hi + 1;
      for (let k = hi + 1; k <= i; k++) if (alt[k]! < alt[low]!) low = k;
      lo = low;
      hi = i > low ? i : low;
      for (let k = low; k <= i; k++) if (alt[k]! > alt[hi]!) hi = k;
    }
  }
  if (hi > lo) emit(lo, hi);
  return out;
}

export interface ClimbRef {
  start: LngLat;
  end: LngLat;
  lengthM: number;
}

export interface ClimbPass {
  /** Seconds since the start of the ride; elapsed time between them is the effort time. */
  startS: number;
  endS: number;
}

/**
 * Every time a ride rides `ref` uphill: it passes within `radiusM` of the start, then of the end,
 * having covered between 80 % and 130 % of the climb's length in between (so a different road
 * between the same points, or riding it downhill, doesn't count). Times are taken at the closest
 * approach to each point. Elapsed time, like Strava segments: stops on the climb count.
 */
export function findClimbPasses(s: ClimbStreamInput, ref: ClimbRef, radiusM = 30): ClimbPass[] {
  if (!s.lat || !s.lng || !s.distance) return [];
  const dist = cumulativeDistance(s.time, s.distance);
  const touches = (target: LngLat) => {
    const out: number[] = [];
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < s.time.length; i++) {
      const p = point(s, i);
      const d = p ? metresBetween(p, target) : Infinity;
      if (d <= radiusM) {
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      } else if (best >= 0 && p) {
        out.push(best);
        best = -1;
        bestD = Infinity;
      }
    }
    if (best >= 0) out.push(best);
    return out;
  };
  const starts = touches(ref.start);
  if (starts.length === 0) return [];
  const ends = touches(ref.end);
  const passes: ClimbPass[] = [];
  let after = -1;
  for (const a of starts) {
    if (a <= after || dist[a] === null) continue;
    for (const b of ends) {
      if (b <= a || dist[b] === null) continue;
      const covered = dist[b]! - dist[a]!;
      if (covered > ref.lengthM * 1.3) break;
      if (covered >= ref.lengthM * 0.8) {
        passes.push({ startS: s.time[a]!, endS: s.time[b]! });
        after = b;
        break;
      }
    }
  }
  return passes;
}

/**
 * Groups climbs that are the same hill: start and end within `radiusM` of the group's first
 * climb, which stays the group's reference. Order the input oldest first so a climb keeps the
 * reference (and id) of the first time it was ridden.
 */
export function groupClimbs<T extends ClimbRef>(climbs: readonly T[], radiusM = 60): Array<{ ref: T; members: T[] }> {
  const groups: Array<{ ref: T; members: T[] }> = [];
  for (const c of climbs) {
    const g = groups.find(
      (x) => metresBetween(x.ref.start, c.start) <= radiusM && metresBetween(x.ref.end, c.end) <= radiusM,
    );
    if (g) g.members.push(c);
    else groups.push({ ref: c, members: [c] });
  }
  return groups;
}

/**
 * Indexes of `refs` whose start and end a ride passes within `radiusM` of (every 5th GPS sample,
 * via a ~110 m grid), so findClimbPasses only runs where a pass is possible. May over-include,
 * never under-include at riding speeds up to ~10 m/s per sample step.
 */
export function climbCandidates(
  s: Pick<ClimbStreamInput, 'lat' | 'lng'>,
  refs: readonly ClimbRef[],
  radiusM = 60,
): number[] {
  if (!s.lat || !s.lng) return [];
  const cell = (p: LngLat) => `${Math.floor(p[1] / 0.001)}:${Math.floor(p[0] / 0.002)}`;
  // Each ref point registered in its own cell and the 8 around it.
  const grid = new Map<string, Array<{ ref: number; end: boolean }>>();
  refs.forEach((r, ref) => {
    for (const [p, end] of [
      [r.start, false],
      [r.end, true],
    ] as const) {
      const [cy, cx] = cell(p).split(':').map(Number) as [number, number];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const key = `${cy + dy}:${cx + dx}`;
          const list = grid.get(key) ?? [];
          list.push({ ref, end });
          grid.set(key, list);
        }
    }
  });
  const nearStart = new Set<number>();
  const nearEnd = new Set<number>();
  for (let i = 0; i < s.lat.length; i += 5) {
    const lat = s.lat[i];
    const lng = s.lng[i];
    if (lat == null || lng == null) continue;
    const p: LngLat = [lng, lat];
    for (const { ref, end } of grid.get(cell(p)) ?? []) {
      const r = refs[ref]!;
      if (metresBetween(p, end ? r.end : r.start) <= radiusM) (end ? nearEnd : nearStart).add(ref);
    }
  }
  return [...nearStart].filter((r) => nearEnd.has(r)).sort((a, b) => a - b);
}

interface TimedPass {
  activityId: string;
  startS: number;
  endS: number;
}

const overlapRatio = (a: TimedPass, b: TimedPass) => {
  const inter = Math.min(a.endS, b.endS) - Math.max(a.startS, b.startS);
  return inter <= 0 ? 0 : inter / (Math.max(a.endS, b.endS) - Math.min(a.startS, b.startS));
};

/**
 * Indexes of climbs that duplicate another: the same hill detected with slightly different end
 * points, so most of its passes cover the same stretch of the same rides (time overlap ≥ `minOverlap`
 * of their union) as a climb with more passes. Climbs ridden as part of a longer one, but with a
 * clearly different extent, are kept.
 */
export function duplicateClimbs(passes: ReadonlyArray<readonly TimedPass[]>, minOverlap = 0.6): Set<number> {
  const order = passes.map((p, i) => ({ p, i })).sort((a, b) => b.p.length - a.p.length || a.i - b.i);
  const kept: Array<Map<string, TimedPass[]>> = [];
  const drop = new Set<number>();
  for (const { p, i } of order) {
    const dup = kept.some((byRide) => {
      const same = p.filter((x) =>
        (byRide.get(x.activityId) ?? []).some((y) => overlapRatio(x, y) >= minOverlap),
      ).length;
      return p.length > 0 && same >= p.length / 2;
    });
    if (dup) {
      drop.add(i);
      continue;
    }
    const byRide = new Map<string, TimedPass[]>();
    for (const x of p) byRide.set(x.activityId, [...(byRide.get(x.activityId) ?? []), x]);
    kept.push(byRide);
  }
  return drop;
}
