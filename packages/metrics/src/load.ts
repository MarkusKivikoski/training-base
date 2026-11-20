import { combineMeanMax, type RideMeanMax } from './combine.js';
import { MEAN_MAX_DURATIONS_S } from './power.js';
import { addDays } from './weeklyVolume.js';

export const CTL_DAYS = 42;
export const ATL_DAYS = 7;

export interface DayLoad {
  date: string;
  /** Sum of TSS for activities on this date (0 on rest days). */
  tss: number;
  /** Fitness: 42-day exponentially weighted TSS. */
  ctl: number;
  /** Fatigue: 7-day exponentially weighted TSS. */
  atl: number;
  /** Form: yesterday's CTL − yesterday's ATL. */
  tsb: number;
}

/**
 * Daily training load (CLAUDE.md):
 *   X_today = X_yesterday + (TSS_today − X_yesterday) / k   (k = 42 for CTL, 7 for ATL)
 *   TSB_today = CTL_yesterday − ATL_yesterday
 * Every date from `from` to `to` is included; days without activities count as TSS 0.
 * CTL and ATL start at 0 the day before `from`.
 */
export function dailyLoad(
  entries: ReadonlyArray<{ date: string; tss: number }>,
  { from, to }: { from: string; to: string },
): DayLoad[] {
  const tssByDate = new Map<string, number>();
  for (const e of entries) tssByDate.set(e.date, (tssByDate.get(e.date) ?? 0) + e.tss);

  const days: DayLoad[] = [];
  let ctl = 0;
  let atl = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const tss = tssByDate.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl = ctl + (tss - ctl) / CTL_DAYS;
    atl = atl + (tss - atl) / ATL_DAYS;
    days.push({ date, tss, ctl, atl, tsb });
  }
  return days;
}

/** eFTP window and factor (CLAUDE.md): 0.95 × best 20-min power in a rolling 90 days. */
export const EFTP_WINDOW_DAYS = 90;
const TWENTY_MIN_INDEX = MEAN_MAX_DURATIONS_S.indexOf(1200);

/** Estimated FTP on `onDate`, from rides in the 90 days ending that date. Null without data. */
export function eftp(rides: readonly RideMeanMax[], onDate: string): number | null {
  const from = addDays(onDate, -(EFTP_WINDOW_DAYS - 1));
  const inWindow = rides.filter((r) => r.date >= from && r.date <= onDate);
  const best = combineMeanMax(inWindow).find((p) => p.durationS === MEAN_MAX_DURATIONS_S[TWENTY_MIN_INDEX]);
  return best ? best.watts * 0.95 : null;
}

/**
 * Continues a daily-load series past its last day with planned TSS, using the same formulas as
 * dailyLoad. Every date after `last.date` up to `to` is included; days without plans count as 0.
 */
export function extendLoad(
  last: DayLoad,
  planned: ReadonlyArray<{ date: string; tss: number }>,
  to: string,
): DayLoad[] {
  const tssByDate = new Map<string, number>();
  for (const p of planned) tssByDate.set(p.date, (tssByDate.get(p.date) ?? 0) + p.tss);

  const days: DayLoad[] = [];
  let { ctl, atl } = last;
  for (let date = addDays(last.date, 1); date <= to; date = addDays(date, 1)) {
    const tss = tssByDate.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl = ctl + (tss - ctl) / CTL_DAYS;
    atl = atl + (tss - atl) / ATL_DAYS;
    days.push({ date, tss, ctl, atl, tsb });
  }
  return days;
}
