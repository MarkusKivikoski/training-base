import { addDays, isoWeekStart, rideTimeS, type VolumeInput } from './weeklyVolume.js';

/**
 * The weeks shown for a month, Monday first: from the Monday on or before the 1st to the
 * Sunday on or after the last day. Each week is 7 ISO dates.
 */
export function monthGrid(yearMonth: string): string[][] {
  const first = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // day 0 of next month
  const weeks: string[][] = [];
  for (let monday = isoWeekStart(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  }
  return weeks;
}

/** "2026-11" → "2026-12" (or back with -1). */
export function shiftMonth(yearMonth: string, by: number): string {
  const [y, m] = yearMonth.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** Garmin activity types that count as gym sessions (user decision, 2026-11-11: strength only). */
export const GYM_SPORTS: readonly string[] = ['strength_training'];

export interface CalendarInput extends VolumeInput {
  /** Garmin activityType.typeKey. */
  sport: string;
  isCycling: boolean;
  load: { tss: number } | null;
}

export interface WeekTotals {
  /** Moving time of rides, seconds (elapsed time when moving time is missing). */
  movingS: number;
  /** Outdoor rides only: trainer distance is virtual. */
  outdoorDistanceM: number;
  rides: number;
  /** Sum of training load (power or heart-rate TSS). */
  tss: number;
  /** Elevation gain of outdoor rides, metres. */
  outdoorElevationM: number;
  /** Gym sessions (GYM_SPORTS), counted but not in the riding totals. */
  gymSessions: number;
  /** Other non-cycling activities (runs, skiing, …), counted but not in the riding totals. */
  otherActivities: number;
}

/** Riding totals for a week's (or month's) activities. Non-cycling activities are only counted. */
export function weekTotals(activities: readonly CalendarInput[]): WeekTotals {
  const t: WeekTotals = {
    movingS: 0,
    outdoorDistanceM: 0,
    rides: 0,
    tss: 0,
    outdoorElevationM: 0,
    gymSessions: 0,
    otherActivities: 0,
  };
  for (const a of activities) {
    if (GYM_SPORTS.includes(a.sport)) {
      t.gymSessions++;
      continue;
    }
    if (!a.isCycling) {
      t.otherActivities++;
      continue;
    }
    t.rides++;
    t.movingS += rideTimeS(a);
    if (!a.isIndoor) {
      t.outdoorDistanceM += a.distanceM ?? 0;
      t.outdoorElevationM += a.elevationGainM ?? 0;
    }
    t.tss += a.load?.tss ?? 0;
  }
  return t;
}

export interface CoverageInput extends VolumeInput {
  isCycling: boolean;
  hasPower: boolean;
  load: { tss: number; source: 'power' | 'hr' } | null;
}

/**
 * How much of a period's riding the TSS covers. Rides without a power meter only get TSS from
 * heart rate when an LTHR is in effect on the day, so a TSS total alone can understate the load.
 */
export interface LoadCoverage {
  rides: number;
  /** Moving time of all rides, seconds. */
  rideS: number;
  /** Rides with a power meter, and their moving time. */
  poweredRides: number;
  poweredS: number;
  powerTss: number;
  powerTssRides: number;
  hrTss: number;
  hrTssRides: number;
  /** Rides with neither power TSS nor heart-rate TSS. */
  noLoadRides: number;
}

/** TSS split by source, and power-data coverage, for a period's rides. Other sports are skipped. */
export function loadCoverage(activities: readonly CoverageInput[]): LoadCoverage {
  const c: LoadCoverage = {
    rides: 0,
    rideS: 0,
    poweredRides: 0,
    poweredS: 0,
    powerTss: 0,
    powerTssRides: 0,
    hrTss: 0,
    hrTssRides: 0,
    noLoadRides: 0,
  };
  for (const a of activities) {
    if (!a.isCycling) continue;
    const timeS = rideTimeS(a);
    c.rides++;
    c.rideS += timeS;
    if (a.hasPower) {
      c.poweredRides++;
      c.poweredS += timeS;
    }
    if (!a.load) {
      c.noLoadRides++;
    } else if (a.load.source === 'power') {
      c.powerTss += a.load.tss;
      c.powerTssRides++;
    } else {
      c.hrTss += a.load.tss;
      c.hrTssRides++;
    }
  }
  return c;
}

/** Heights of one day's slice of a background curve: at its left edge, centre and right edge. */
export interface BandSlice {
  left: number;
  center: number;
  right: number;
}

/**
 * Curve points for one calendar week. Each day sits at its centre; slice edges are the average
 * with the neighbouring day (from the previous/next week at the row ends), so the curve continues
 * seamlessly from one week row to the next. Days without a value get null (the curve stops there).
 */
export function bandPoints(
  values: readonly (number | null)[],
  prev: number | null,
  next: number | null,
): (BandSlice | null)[] {
  const at = (i: number) => (i < 0 ? prev : i >= values.length ? next : (values[i] ?? null));
  return values.map((v, i) => {
    if (v === null || v === undefined) return null;
    const l = at(i - 1);
    const r = at(i + 1);
    return { left: l === null ? v : (l + v) / 2, center: v, right: r === null ? v : (v + r) / 2 };
  });
}
