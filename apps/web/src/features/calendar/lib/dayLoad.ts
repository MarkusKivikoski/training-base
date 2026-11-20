import { addDays, bandPoints, loadStatus, type BandSlice, type Classified, type DayLoadInput } from '@app/metrics';
import { formatLoad } from '@/shared/lib/formatters';
import { STATUS_COLOR, STATUS_ICON } from '../constants';
import type { Background } from '../search';

/** One day's background value (CTL or ATL) and its zone. */
export type DayLoad = {
  value: number;
  status: Classified;
};

/**
 * The chosen measure per date. Zones are computed over the whole series, because the baseline
 * counts from the first day with load. Empty when the background is off.
 */
export const dayLoadByDate = (days: readonly DayLoadInput[], background: Background): Map<string, DayLoad> => {
  const byDate = new Map<string, DayLoad>();
  if (background === 'off') return byDate;

  days.forEach((day, i) => {
    const status = loadStatus(days, i);
    const dayLoad =
      background === 'fitness'
        ? { value: day.ctl, status: status.fitness }
        : { value: day.atl, status: status.fatigue };
    byDate.set(day.date, dayLoad);
  });
  return byDate;
};

/** "Fitness" or "Fatigue". */
export const measureName = (background: Background) => (background === 'fitness' ? 'Fitness' : 'Fatigue');

/** "CTL" or "ATL". */
export const measureAbbreviation = (background: Background) => (background === 'fitness' ? 'CTL' : 'ATL');

/** The day's band colour: its zone colour, or the plain series colour during the baseline. */
export const dayLoadColor = (dayLoad: DayLoad | undefined, background: Background): string => {
  if (!dayLoad) return 'transparent';
  if (dayLoad.status.baseline) return background === 'fitness' ? 'var(--series-1)' : 'var(--series-2)';
  return STATUS_COLOR[dayLoad.status.zone.status];
};

/** The zone's icon, or a dot during the baseline. */
export const dayLoadIcon = (dayLoad: DayLoad): string =>
  dayLoad.status.baseline ? '•' : STATUS_ICON[dayLoad.status.zone.status];

/** "Fatigue 38.9 · Overreaching" (no zone during the baseline). */
export const dayLoadText = (dayLoad: DayLoad | undefined, background: Background): string | undefined => {
  if (!dayLoad) return undefined;
  const text = `${measureName(background)} ${formatLoad(dayLoad.value)}`;
  if (dayLoad.status.baseline) return text;
  return `${text} · ${dayLoad.status.zone.label}`;
};

/** The highest value on the given dates, 0 when there is none. */
export const peakLoad = (dates: readonly string[], byDate: ReadonlyMap<string, DayLoad>): number => {
  let peak = 0;
  for (const date of dates) peak = Math.max(peak, byDate.get(date)?.value ?? 0);
  return peak;
};

/** The day's value as a share of the peak (0–1), or null without a value. */
export const scaledLoad = (dayLoad: DayLoad | undefined, peak: number): number | null => {
  if (dayLoad === undefined || peak === 0) return null;
  return dayLoad.value / peak;
};

/**
 * The band slices for one week row, scaled to `peak`. The days before and after the week are
 * included, so the curve continues into the neighbouring rows.
 */
export const weekBand = (
  week: readonly string[],
  byDate: ReadonlyMap<string, DayLoad>,
  peak: number,
): (BandSlice | null)[] => {
  const scaledOn = (date: string) => scaledLoad(byDate.get(date), peak);
  const dayBefore = addDays(week[0]!, -1);
  const dayAfter = addDays(week.at(-1)!, 1);
  return bandPoints(week.map(scaledOn), scaledOn(dayBefore), scaledOn(dayAfter));
};
