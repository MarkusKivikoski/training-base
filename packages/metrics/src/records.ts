import type { Discipline } from './discipline.js';
import { addDays, isoWeekStart, rideTimeS, type VolumeInput } from './weeklyVolume.js';

/** Distances for fastest-effort records, metres. */
export const RECORD_DISTANCES_M = [
  1_000, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000,
] as const;

/**
 * Fastest plausible cycling speed, m/s (90 km/h). Faster distance jumps and speed samples are
 * GPS glitches: real data showed 2 km "in 7 s" and runs of 173 km/h samples.
 */
export const MAX_PLAUSIBLE_SPEED_MPS = 25;

/** Distances for fastest-effort run records, metres. The last two are the half marathon and the marathon. */
export const RUN_RECORD_DISTANCES_M = [1_000, 3_000, 5_000, 10_000, 15_000, 21_098, 42_195] as const;

/** Fastest plausible running speed, m/s (36 km/h, close to a world-class sprint). Faster is a GPS glitch. */
export const MAX_PLAUSIBLE_RUN_SPEED_MPS = 10;

/** Record distances and the glitch limit per discipline. */
export const RECORD_INPUTS: Record<Discipline, { distancesM: readonly number[]; maxSpeedMps: number }> = {
  cycling: { distancesM: RECORD_DISTANCES_M, maxSpeedMps: MAX_PLAUSIBLE_SPEED_MPS },
  running: { distancesM: RUN_RECORD_DISTANCES_M, maxSpeedMps: MAX_PLAUSIBLE_RUN_SPEED_MPS },
};

/**
 * Cumulative distance with glitches removed: null samples are skipped, a distance that goes
 * backwards (a device reset) adds nothing, and an increment faster than `maxMps` adds nothing.
 * Dropping glitches can only make efforts slower, never fake-fast.
 */
export function cleanDistance(
  time: readonly number[],
  distance: readonly (number | null)[],
  maxMps = MAX_PLAUSIBLE_SPEED_MPS,
): { t: number[]; d: number[] } {
  const t: number[] = [];
  const d: number[] = [];
  let total = 0;
  let prevRaw: number | null = null;
  let prevT = 0;
  for (let i = 0; i < time.length; i++) {
    const v = distance[i];
    if (v === null || v === undefined) continue;
    if (prevRaw !== null) {
      const inc = v - prevRaw;
      const dt = time[i]! - prevT;
      if (inc > 0 && inc <= maxMps * Math.max(dt, 1)) total += inc;
    }
    prevRaw = v;
    prevT = time[i]!;
    t.push(time[i]!);
    d.push(total);
  }
  return { t, d };
}

/**
 * Fastest elapsed time (seconds) to cover each distance anywhere in a ride, from the device's
 * cumulative distance (cleaned, see cleanDistance). Elapsed time: stops inside the stretch
 * count, like Strava best efforts. Null where the ride is shorter than the distance.
 */
export function bestDistanceEfforts(
  time: readonly number[],
  distance: readonly (number | null)[],
  distancesM: readonly number[] = RECORD_DISTANCES_M,
  maxMps = MAX_PLAUSIBLE_SPEED_MPS,
): (number | null)[] {
  const { t, d } = cleanDistance(time, distance, maxMps);
  return distancesM.map((target) => {
    let best: number | null = null;
    let i = 0;
    for (let j = 0; j < d.length; j++) {
      // Move the start forward while the stretch still covers the target.
      while (i + 1 <= j && d[j]! - d[i + 1]! >= target) i++;
      if (d[j]! - d[i]! >= target) {
        const s = t[j]! - t[i]!;
        if (best === null || s < best) best = s;
      }
    }
    return best;
  });
}

/**
 * Highest average speed (m/s) over at least `windowS` seconds. Samples above `maxMps` are
 * dropped as glitches, and averaging over a few seconds removes remaining single-sample spikes.
 */
export function maxSustainedSpeed(
  time: readonly number[],
  speed: readonly (number | null)[],
  windowS = 3,
  maxMps = MAX_PLAUSIBLE_SPEED_MPS,
): number | null {
  const t: number[] = [];
  const v: number[] = [];
  for (let i = 0; i < time.length; i++) {
    const s = speed[i];
    if (s !== null && s !== undefined && s <= maxMps) {
      t.push(time[i]!);
      v.push(s);
    }
  }
  let best: number | null = null;
  let i = 0;
  let sum = 0; // Σ speed × seconds over samples i..j-1, each sample holding until the next.
  for (let j = 1; j < t.length; j++) {
    const dt = t[j]! - t[j - 1]!;
    // Long gaps are pauses, not riding: restart the window after them.
    if (dt > 30) {
      i = j;
      sum = 0;
      continue;
    }
    sum += v[j - 1]! * dt;
    while (i < j - 1 && t[j]! - t[i + 1]! >= windowS) {
      sum -= v[i]! * (t[i + 1]! - t[i]!);
      i++;
    }
    const span = t[j]! - t[i]!;
    if (span >= windowS) {
      const avg = sum / span;
      if (best === null || avg > best) best = avg;
    }
  }
  return best;
}

/**
 * Moving time (s) from a stream: seconds between consecutive samples while moving at least
 * `minMps` (about 3.6 km/h), leaving out gaps longer than `maxGapS` (pauses). Used instead of
 * Garmin's moving time, which is sometimes far too low (34 km "in 45 min").
 */
export function streamMovingTime(
  time: readonly number[],
  speed: readonly (number | null)[],
  minMps = 1,
  maxGapS = 30,
): number {
  let total = 0;
  for (let i = 1; i < time.length; i++) {
    const dt = time[i]! - time[i - 1]!;
    const v = speed[i - 1];
    if (dt > 0 && dt <= maxGapS && v !== null && v !== undefined && v >= minMps) total += dt;
  }
  return total;
}

/** The `n` items with the highest `value` (or lowest, with `lowest`); ties keep the earlier date. */
export function topN<T extends { date: string }>(
  items: readonly T[],
  value: (x: T) => number | null,
  n = 3,
  lowest = false,
): Array<T & { value: number }> {
  return items
    .map((x) => ({ ...x, value: value(x) }))
    .filter((x): x is T & { value: number } => x.value !== null && Number.isFinite(x.value))
    .sort((a, b) => (lowest ? a.value - b.value : b.value - a.value) || a.date.localeCompare(b.date))
    .slice(0, n);
}

export type Period = 'week' | 'month' | 'year';

export interface PeriodTotal {
  /** Week: Monday YYYY-MM-DD; month: YYYY-MM; year: YYYY. Used as the record's `date`. */
  date: string;
  hours: number;
  distanceKm: number;
  elevationM: number;
  rides: number;
}

const periodKey = (date: string, p: Period) =>
  p === 'week' ? isoWeekStart(date) : p === 'month' ? date.slice(0, 7) : date.slice(0, 4);

/** Moving hours, km, elevation and ride count per calendar week (ISO), month or year, for the given rides. */
export function periodTotals(rides: readonly VolumeInput[], period: Period): PeriodTotal[] {
  const by = new Map<string, PeriodTotal>();
  for (const r of rides) {
    const key = periodKey(r.date, period);
    const p = by.get(key) ?? { date: key, hours: 0, distanceKm: 0, elevationM: 0, rides: 0 };
    p.rides++;
    p.hours += rideTimeS(r) / 3600;
    p.distanceKm += (r.distanceM ?? 0) / 1000;
    p.elevationM += r.elevationGainM ?? 0;
    by.set(key, p);
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface Streak {
  length: number;
  from: string;
  to: string;
}

/** Longest run of consecutive items in sorted, distinct keys, where `next(k)` is the following key. */
function longestRun(keys: readonly string[], next: (k: string) => string): Streak | null {
  let best: Streak | null = null;
  let start = 0;
  for (let i = 0; i < keys.length; i++) {
    if (i > 0 && keys[i] !== next(keys[i - 1]!)) start = i;
    const len = i - start + 1;
    if (best === null || len > best.length) best = { length: len, from: keys[start]!, to: keys[i]! };
  }
  return best;
}

/** Run of consecutive keys ending at `last` (or at the key before it): the current streak. */
function currentRun(keys: readonly string[], next: (k: string) => string, last: string): Streak | null {
  const set = new Set(keys);
  const prev = (k: string) => keys.find((x) => next(x) === k);
  const end = set.has(last) ? last : prev(last);
  if (!end) return null;
  let from = end;
  let length = 1;
  for (let p = prev(from); p && set.has(p); p = prev(from)) {
    from = p;
    length++;
  }
  return { length, from, to: end };
}

/**
 * Longest streaks of consecutive riding days and of consecutive ISO weeks with a ride, plus the
 * streaks still running on `today` (a streak is current if it reaches today or yesterday / last week).
 */
export function streaks(
  dates: readonly string[],
  today: string,
): { days: Streak | null; weeks: Streak | null; currentDays: Streak | null; currentWeeks: Streak | null } {
  const days = [...new Set(dates)].sort();
  const weeks = [...new Set(dates.map(isoWeekStart))].sort();
  const nextDay = (d: string) => addDays(d, 1);
  const nextWeek = (w: string) => addDays(w, 7);
  return {
    days: longestRun(days, nextDay),
    weeks: longestRun(weeks, nextWeek),
    currentDays: currentRun(days, nextDay, today),
    currentWeeks: currentRun(weeks, nextWeek, isoWeekStart(today)),
  };
}
