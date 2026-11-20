import { PLAUSIBLE_HR } from './hr.js';
import { combineMeanMax, type RideMeanMax } from './combine.js';
import { eftp } from './load.js';
import { MEAN_MAX_DURATIONS_S } from './power.js';
import {
  addDays,
  isoWeekStart,
  outdoorDistanceM,
  outdoorElevationGainM,
  rideTimeS,
  type VolumeInput,
} from './weeklyVolume.js';

/** Activity fields Trends needs. Structurally compatible with ActivitySummary. */
export interface TrendInput extends VolumeInput {
  isCycling: boolean;
  /** Garmin typeKey; "strength_training" is counted as strength sessions. */
  sport: string;
}

export interface MonthVolume {
  /** YYYY-MM */
  month: string;
  indoorS: number;
  outdoorS: number;
  distanceM: number;
  elevationGainM: number;
  rides: number;
  strengthSessions: number;
}

const STRENGTH_SPORT = 'strength_training';

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Totals per calendar month from `from` to `to` (YYYY-MM-DD, inclusive), oldest first,
 * empty months included. Cycling feeds the riding fields; strength sessions are counted;
 * other sports are ignored.
 */
export function monthlyVolume(
  activities: readonly TrendInput[],
  { from, to }: { from: string; to: string },
): MonthVolume[] {
  const months: MonthVolume[] = [];
  const byMonth = new Map<string, MonthVolume>();
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = nextMonth(m)) {
    const v: MonthVolume = {
      month: m,
      indoorS: 0,
      outdoorS: 0,
      distanceM: 0,
      elevationGainM: 0,
      rides: 0,
      strengthSessions: 0,
    };
    months.push(v);
    byMonth.set(m, v);
  }
  for (const a of activities) {
    if (a.date < from || a.date > to) continue;
    const v = byMonth.get(a.date.slice(0, 7));
    if (!v) continue;
    if (a.isCycling) {
      if (a.isIndoor) v.indoorS += rideTimeS(a);
      else v.outdoorS += rideTimeS(a);
      v.distanceM += outdoorDistanceM(a);
      v.elevationGainM += outdoorElevationGainM(a);
      v.rides++;
    } else if (a.sport === STRENGTH_SPORT) {
      v.strengthSessions++;
    }
  }
  return months;
}

/** The volume measures Trends can show and compare: moving hours, kilometres, metres climbed, ride count. */
export const VOLUME_METRICS = ['hours', 'distanceKm', 'elevationM', 'rides'] as const;
export type VolumeMetric = (typeof VOLUME_METRICS)[number];
export type MetricValues = Record<VolumeMetric, number>;

/** Year-over-year measures: the riding measures plus gym workouts (strength training sessions). */
export const YEAR_METRICS = [...VOLUME_METRICS, 'gym'] as const;
export type YearMetric = (typeof YEAR_METRICS)[number];
type YearValues = Record<YearMetric, number>;

export interface YearCumulative {
  year: number;
  /**
   * Per metric, the cumulative total at the end of week 1..53 of the year (days 1–7, 8–14, …).
   * The current year stops at the week containing today.
   */
  weeks: Record<YearMetric, number[]>;
  /** Per metric, the total from 1 Jan up to and including today's month-day in that year. */
  toDate: YearValues;
}

const dayOfYear = (date: string) =>
  Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000) + 1;

/** An activity's contribution to each metric, in display units: rides to the riding measures, strength sessions to gym. */
const contribution = (r: TrendInput): YearValues =>
  r.isCycling
    ? {
        hours: rideTimeS(r) / 3600,
        distanceKm: outdoorDistanceM(r) / 1000,
        elevationM: outdoorElevationGainM(r),
        rides: 1,
        gym: 0,
      }
    : { hours: 0, distanceKm: 0, elevationM: 0, rides: 0, gym: 1 };

/** Display rounding: hours and km to 0.1, metres and rides to whole numbers. */
const roundMetric = (m: YearMetric, v: number) =>
  m === 'hours' || m === 'distanceKm' ? Math.round(v * 10) / 10 : Math.round(v);

const zeros = (): YearValues => ({ hours: 0, distanceKm: 0, elevationM: 0, rides: 0, gym: 0 });

/**
 * Cumulative riding volume and gym workouts per year and metric, for year-over-year comparison.
 * Oldest year first; a year counts if it has rides or strength sessions.
 */
export function cumulativeByYear(rides: readonly TrendInput[], { today }: { today: string }): YearCumulative[] {
  const cycling = rides.filter((r) => (r.isCycling || r.sport === STRENGTH_SPORT) && r.date <= today);
  const years = [...new Set(cycling.map((r) => Number(r.date.slice(0, 4))))].sort((a, b) => a - b);
  const todayYear = Number(today.slice(0, 4));
  const todayWeek = Math.ceil(dayOfYear(today) / 7);
  const monthDay = today.slice(5);

  return years.map((year) => {
    const perWeek = Array.from({ length: 53 }, zeros);
    const toDate = zeros();
    for (const r of cycling) {
      if (!r.date.startsWith(`${year}-`)) continue;
      const c = contribution(r);
      const week = perWeek[Math.min(53, Math.ceil(dayOfYear(r.date) / 7)) - 1]!;
      for (const m of YEAR_METRICS) {
        week[m] += c[m];
        if (r.date.slice(5) <= monthDay) toDate[m] += c[m];
      }
    }
    const lastWeek = year === todayYear ? todayWeek : 53;
    const weeks = Object.fromEntries(
      YEAR_METRICS.map((m) => {
        let total = 0;
        return [m, perWeek.slice(0, lastWeek).map((w) => roundMetric(m, (total += w[m])))];
      }),
    ) as Record<YearMetric, number[]>;
    const rounded = Object.fromEntries(YEAR_METRICS.map((m) => [m, roundMetric(m, toDate[m])])) as YearValues;
    return { year, weeks, toDate: rounded };
  });
}

/**
 * VO2 max estimate (ml/kg/min) from the ACSM leg-cycling metabolic equation,
 * VO2 = 1.8 × (W × 6.12) / kg + 7, with best 5-min power standing in for power at VO2 max.
 * An estimate only, never Garmin's value. Null without power or weight.
 */
export function vo2maxEstimate(best5minW: number | null | undefined, kg: number | null | undefined): number | null {
  if (!best5minW || !kg || best5minW <= 0 || kg <= 0) return null;
  return (1.8 * best5minW * 6.12) / kg + 7;
}

/** Efficiency factor: normalized power per heartbeat (NP / average HR). Null without either. */
export function efficiencyFactor(np: number | null | undefined, avgHr: number | null | undefined): number | null {
  if (!np || !avgHr || np <= 0 || avgHr <= 0) return null;
  return np / avgHr;
}

/** Sample dates: the end of each ISO week (Sunday, or `to` for the current week) from the week of `first` through `to`. */
function weekEnds(first: string, to: string): string[] {
  const out: string[] = [];
  for (let monday = isoWeekStart(first); monday <= to; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    out.push(sunday < to ? sunday : to);
  }
  return out;
}

const poweredUpTo = (rides: readonly RideMeanMax[], to: string) =>
  rides.filter((r) => r.date <= to && r.meanMaxPower?.some((v) => v !== null));

const firstDate = (rides: readonly RideMeanMax[]) =>
  rides.reduce((min, r) => (r.date < min ? r.date : min), rides[0]!.date);

/**
 * eFTP sampled at each week end from the week of the first ride with power through `to`.
 * Weeks with no power in the 90-day window are skipped.
 */
export function eftpSeries(
  rides: readonly RideMeanMax[],
  { to }: { to: string },
): Array<{ date: string; watts: number }> {
  const powered = poweredUpTo(rides, to);
  if (powered.length === 0) return [];
  const out: Array<{ date: string; watts: number }> = [];
  for (const date of weekEnds(firstDate(powered), to)) {
    const watts = eftp(powered, date);
    if (watts !== null) out.push({ date, watts: Math.round(watts) });
  }
  return out;
}

/** Window for the VO2 max estimate's best 5-min power, the same rolling 90 days as eFTP. */
export const VO2MAX_WINDOW_DAYS = 90;
const FIVE_MIN_INDEX = MEAN_MAX_DURATIONS_S.indexOf(300);

/**
 * VO2 max estimate sampled at each week end: best 5-min power in the 90 days ending that date,
 * per kg of the weight `kgOn` returns for that date. A per-ride value would mostly reflect how
 * hard that ride was; the rolling best tracks fitness, like eFTP. Weeks without power or weight are skipped.
 */
export function vo2maxSeries(
  rides: readonly RideMeanMax[],
  { to, kgOn }: { to: string; kgOn: (date: string) => number | null },
): Array<{ date: string; vo2max: number; best5minW: number; kg: number; activityId: string }> {
  const powered = poweredUpTo(rides, to);
  if (powered.length === 0) return [];
  const out: Array<{ date: string; vo2max: number; best5minW: number; kg: number; activityId: string }> = [];
  for (const date of weekEnds(firstDate(powered), to)) {
    const from = addDays(date, -(VO2MAX_WINDOW_DAYS - 1));
    const best = combineMeanMax(powered.filter((r) => r.date >= from && r.date <= date)).find(
      (p) => p.durationS === MEAN_MAX_DURATIONS_S[FIVE_MIN_INDEX],
    );
    const kg = kgOn(date);
    const vo2max = best ? vo2maxEstimate(best.watts, kg) : null;
    if (best && kg && vo2max !== null)
      out.push({ date, vo2max, best5minW: best.watts, kg, activityId: best.activityId });
  }
  return out;
}

/** A ride's stored time in zones (seconds per zone), as on ActivitySummary.zones. */
export interface ZonesInput {
  date: string;
  isCycling: boolean;
  zones: { power: { seconds: number[] } | null; hr: { seconds: number[] } | null };
}

export interface ZonePeriod {
  /** ISO week Monday (weeks) or YYYY-MM (months). */
  period: string;
  /** Seconds per power zone (7), summed over rides with power. */
  power: number[];
  /** Seconds per heart-rate zone (5), summed over rides with heart rate. */
  hr: number[];
}

const addSeconds = (into: number[], add: readonly number[]) => add.forEach((s, i) => (into[i] = (into[i] ?? 0) + s));

/**
 * Time in zones summed per ISO week or calendar month, from the first ride through `to`, empty
 * periods included. Cycling only, like the per-ride zones.
 */
export function zonePeriods(
  rides: readonly ZonesInput[],
  { by, to }: { by: 'week' | 'month'; to: string },
): ZonePeriod[] {
  const cycling = rides.filter((r) => r.isCycling && r.date <= to && (r.zones.power || r.zones.hr));
  if (cycling.length === 0) return [];
  const keyOf = (date: string) => (by === 'week' ? isoWeekStart(date) : date.slice(0, 7));
  const first = cycling.reduce((m, r) => (r.date < m ? r.date : m), cycling[0]!.date);
  const out: ZonePeriod[] = [];
  const index = new Map<string, ZonePeriod>();
  const next = (k: string) => (by === 'week' ? addDays(k, 7) : addDays(`${k}-28`, 7).slice(0, 7));
  for (let k = keyOf(first); k <= keyOf(to); k = next(k)) {
    const p: ZonePeriod = { period: k, power: new Array<number>(7).fill(0), hr: new Array<number>(5).fill(0) };
    out.push(p);
    index.set(k, p);
  }
  for (const r of cycling) {
    const p = index.get(keyOf(r.date));
    if (!p) continue;
    if (r.zones.power) addSeconds(p.power, r.zones.power.seconds);
    if (r.zones.hr) addSeconds(p.hr, r.zones.hr.seconds);
  }
  return out;
}

export interface MaxHrInput {
  id: string;
  date: string;
  name: string;
  sport: string;
  /** Only rides count: running max HR sits at a different level and would mix two scales. */
  isCycling: boolean;
  /** Best 5-second average heart rate in the activity. */
  hrPeak5s: number | null;
  /** Highest single reading (Garmin's max HR for the activity). */
  maxHr: number | null;
}

export interface YearMaxHr {
  year: number;
  /** Best 5-second average of the year, and the activity it came from. */
  bpm: number;
  id: string;
  date: string;
  name: string;
  sport: string;
  /** Highest single reading of the year (may be a sensor spike). */
  peakBpm: number | null;
}

/** Highest 5-second heart rate per year from rides only, oldest year first. */
export function maxHrByYear(acts: readonly MaxHrInput[]): YearMaxHr[] {
  const byYear = new Map<number, YearMaxHr>();
  for (const a of acts) {
    if (!a.isCycling) continue;
    const year = Number(a.date.slice(0, 4));
    const cur = byYear.get(year);
    const peak = a.maxHr !== null && a.maxHr <= PLAUSIBLE_HR.max ? a.maxHr : null;
    if (a.hrPeak5s !== null && (!cur || a.hrPeak5s > cur.bpm || (a.hrPeak5s === cur.bpm && a.date < cur.date))) {
      byYear.set(year, {
        year,
        bpm: a.hrPeak5s,
        id: a.id,
        date: a.date,
        name: a.name,
        sport: a.sport,
        peakBpm: Math.max(peak ?? 0, cur?.peakBpm ?? 0) || null,
      });
    } else if (cur && peak !== null && peak > (cur.peakBpm ?? 0)) {
      cur.peakBpm = peak;
    }
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}
