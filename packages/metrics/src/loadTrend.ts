import { zoneFor, type Classified, type LoadZone } from './loadStatus.js';
import { addDays, isoWeekStart } from './weeklyVolume.js';

/**
 * Last 7 days' TSS ÷ the average weekly TSS of the 4 weeks before (days 8–35 back): how fast
 * training load is rising compared with what you're used to. The useful idea behind Strava's
 * Relative Effort weekly range, on the app's own TSS.
 */
export const WEEK_LOAD_ZONES: readonly LoadZone[] = [
  { status: 'neutral', label: 'Recovery week', min: null, max: 0.8 },
  { status: 'good', label: 'Steady', min: 0.8, max: 1.2 },
  { status: 'good', label: 'Building', min: 1.2, max: 1.4 },
  { status: 'serious', label: 'Big jump', min: 1.4, max: 1.6 },
  { status: 'critical', label: 'Very big jump', min: 1.6, max: null },
];

/** The comparison needs 5 weeks of history (this week plus 4 before it). */
export const WEEK_LOAD_HISTORY_DAYS = 35;
/** Below this usual weekly TSS the ratio swings wildly on a single ride, so it isn't classified. */
export const MIN_USUAL_WEEKLY_TSS = 20;

export interface DayTss {
  date: string;
  tss: number;
}

export interface WeeklyLoadTrend {
  /** TSS in the 7 days ending today. */
  last7: number;
  /** Average weekly TSS over the 28 days before that. */
  usualWeek: number;
  /** last7 ÷ usualWeek, with its zone; baseline while history is too short. */
  status: Classified;
  /** First date with enough history (null without any load). */
  readyFrom: string | null;
}

const sumBetween = (byDate: Map<string, number>, from: string, to: string) => {
  let total = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) total += byDate.get(d) ?? 0;
  return total;
};

/** Rolling 7-day load against the previous 4 weeks, as of `today`. Days without load count as 0. */
export function weeklyLoadTrend(days: readonly DayTss[], today: string): WeeklyLoadTrend {
  const byDate = new Map(days.map((d) => [d.date, d.tss]));
  const first = days[0]?.date ?? null;
  const readyFrom = first ? addDays(first, WEEK_LOAD_HISTORY_DAYS - 1) : null;
  const last7 = sumBetween(byDate, addDays(today, -6), today);
  const usualWeek = sumBetween(byDate, addDays(today, -34), addDays(today, -7)) / 4;
  const ready = readyFrom !== null && today >= readyFrom && usualWeek >= MIN_USUAL_WEEKLY_TSS;
  const ratio = usualWeek > 0 ? last7 / usualWeek : 0;
  return {
    last7,
    usualWeek,
    status: ready ? { baseline: false, zone: zoneFor(ratio, WEEK_LOAD_ZONES), value: ratio } : { baseline: true },
    readyFrom,
  };
}

export interface WeekTssRow {
  /** Monday of the ISO week. */
  weekStart: string;
  tss: number;
  /** Average of the 4 weeks before; null until there are 4 weeks of history. */
  usual: number | null;
}

/** TSS per ISO week for the `weeks` weeks ending with the week of `today`, oldest first. */
export function weeklyTss(days: readonly DayTss[], { today, weeks }: { today: string; weeks: number }): WeekTssRow[] {
  const byWeek = new Map<string, number>();
  for (const d of days) byWeek.set(isoWeekStart(d.date), (byWeek.get(isoWeekStart(d.date)) ?? 0) + d.tss);
  const firstWeek = days[0] ? isoWeekStart(days[0].date) : null;
  const last = isoWeekStart(today);
  const rows: WeekTssRow[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(last, -7 * i);
    const prev = [1, 2, 3, 4].map((k) => addDays(weekStart, -7 * k));
    const hasHistory = firstWeek !== null && prev[3]! >= firstWeek;
    rows.push({
      weekStart,
      tss: byWeek.get(weekStart) ?? 0,
      usual: hasHistory ? prev.reduce((n, w) => n + (byWeek.get(w) ?? 0), 0) / 4 : null,
    });
  }
  return rows;
}
