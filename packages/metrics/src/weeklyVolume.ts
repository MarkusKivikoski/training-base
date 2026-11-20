/** Minimal activity fields needed for volume. Structurally compatible with ActivitySummary. */
export interface VolumeInput {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  durationS: number;
  /** Moving time; volume uses it when present (stops at lights and cafés excluded). */
  movingDurationS?: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  isIndoor: boolean;
}

/**
 * Riding time used for volume: moving time, or elapsed duration when moving time is missing
 * or zero (some older indoor recordings report 0 moving time).
 */
export function rideTimeS(a: Pick<VolumeInput, 'durationS' | 'movingDurationS'>): number {
  return a.movingDurationS ? a.movingDurationS : a.durationS;
}

/*
 * Distance and elevation count outdoor rides only. Indoors the head unit isn't linked to the
 * virtual course, so its distance is a speed estimate and its climbing doesn't reflect the route.
 * Indoor rides still count in full towards riding time.
 */

/** Distance for volume totals: the ride's distance outdoors, 0 indoors. */
export function outdoorDistanceM(a: Pick<VolumeInput, 'distanceM' | 'isIndoor'>): number {
  if (a.isIndoor) return 0;
  return a.distanceM ?? 0;
}

/** Elevation gain for volume totals: the ride's gain outdoors, 0 indoors. */
export function outdoorElevationGainM(a: Pick<VolumeInput, 'elevationGainM' | 'isIndoor'>): number {
  if (a.isIndoor) return 0;
  return a.elevationGainM ?? 0;
}

export interface WeekVolume {
  /** Monday of the ISO week, YYYY-MM-DD. */
  weekStart: string;
  indoorDurationS: number;
  outdoorDurationS: number;
  distanceM: number;
  elevationGainM: number;
  count: number;
}

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** Monday (ISO week start) of the week containing `date`. */
export function isoWeekStart(date: string): string {
  const d = toUtc(date);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return fmt(d);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/**
 * Totals per ISO week for the `weeks` weeks ending with the week containing `endDate`,
 * oldest first. Weeks without activities are included with zeros.
 */
export function weeklyVolume(
  activities: readonly VolumeInput[],
  { endDate, weeks }: { endDate: string; weeks: number },
): WeekVolume[] {
  const lastWeek = isoWeekStart(endDate);
  const result: WeekVolume[] = [];
  const byWeek = new Map<string, WeekVolume>();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(lastWeek, -7 * i);
    const w: WeekVolume = {
      weekStart,
      indoorDurationS: 0,
      outdoorDurationS: 0,
      distanceM: 0,
      elevationGainM: 0,
      count: 0,
    };
    result.push(w);
    byWeek.set(weekStart, w);
  }
  for (const a of activities) {
    const w = byWeek.get(isoWeekStart(a.date));
    if (!w) continue;
    if (a.isIndoor) w.indoorDurationS += rideTimeS(a);
    else w.outdoorDurationS += rideTimeS(a);
    w.distanceM += outdoorDistanceM(a);
    w.elevationGainM += outdoorElevationGainM(a);
    w.count++;
  }
  return result;
}
