import { addDays, extendLoad, loadStatus, zoneBands, type DayBands, type DayStatus } from '@app/metrics';
import type { DayLoad } from '@/shared/api/client';
import { FITNESS_RANGE_DAYS, type FitnessRange } from '../constants';

/** One day of the fitness chart: the load values plus that day's zones (null in the baseline period). */
export interface FitnessRow extends DayLoad {
  status: DayStatus;
  bands: DayBands | null;
  /** A forecast day: its TSS is planned, not ridden. */
  isPlanned: boolean;
}

/**
 * Adds each day's zones, and forecast days for sessions planned after today. Zones are computed
 * over the whole series, because the baseline period counts from the first day with load.
 */
export const buildFitnessRows = (
  days: readonly DayLoad[],
  planned: ReadonlyArray<{ date: string; tss: number }> = [],
  today?: string,
): FitnessRow[] => {
  const last = days.at(-1);
  const forecastFrom = today ?? last?.date ?? '';
  const upcoming = planned.filter((plan) => plan.date > forecastFrom);
  let lastPlannedDate = '';
  for (const plan of upcoming) if (plan.date > lastPlannedDate) lastPlannedDate = plan.date;
  const forecast = last && lastPlannedDate > last.date ? extendLoad(last, upcoming, lastPlannedDate) : [];

  const all = [...days, ...forecast];
  const bands = zoneBands(all);
  return all.map((day, i) => ({
    ...day,
    status: loadStatus(all, i),
    bands: bands[i] ?? null,
    isPlanned: i >= days.length,
  }));
};

/** The ridden days only (no forecast). */
export const riddenRows = (rows: readonly FitnessRow[]): FitnessRow[] => rows.filter((row) => !row.isPlanned);

/** The rows within the chosen range, ending today, plus any forecast days after it. */
export const rowsInRange = (rows: readonly FitnessRow[], today: string, range: FitnessRange): FitnessRow[] => {
  const days = FITNESS_RANGE_DAYS[range];
  if (days === null) return [...rows];
  const firstShown = addDays(today, -days);
  return rows.filter((row) => row.date > firstShown);
};

type LoadKey = 'ctl' | 'atl' | 'tsb';

/** How much a load value changed since a week ago, or null without both days. */
export const changeSinceWeekAgo = (current: DayLoad | undefined, weekAgo: DayLoad | undefined, key: LoadKey) => {
  if (!current || !weekAgo) return null;
  return current[key] - weekAgo[key];
};
