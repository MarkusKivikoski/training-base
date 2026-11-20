import { rideTimeS } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { formatDistance, formatDuration, formatSport, formatTss } from '@/shared/lib/formatters';
import { WEEKDAYS } from '../constants';

/** Whether a date (YYYY-MM-DD) is in a month (YYYY-MM). */
export const isInMonth = (date: string, month: string) => date.startsWith(month);

/** Activities per date, oldest first within a day. */
export const activitiesByDate = (activities: readonly Activity[]): Map<string, Activity[]> => {
  const byDate = new Map<string, Activity[]>();
  for (const activity of activities) {
    const list = byDate.get(activity.date) ?? [];
    list.push(activity);
    byDate.set(activity.date, list);
  }
  for (const list of byDate.values()) {
    list.sort((first, second) => first.startTimeLocal.localeCompare(second.startTimeLocal));
  }
  return byDate;
};

/** The activities on the given dates, in date order. */
export const activitiesOn = (dates: readonly string[], byDate: ReadonlyMap<string, Activity[]>): Activity[] =>
  dates.flatMap((date) => byDate.get(date) ?? []);

/** "1 h 42 min · 45.3 km" for outdoor rides; just the time otherwise. */
export const entryDetail = (activity: Activity): string => {
  const time = formatDuration(rideTimeS(activity));
  const showsDistance = activity.isCycling && !activity.isIndoor && Boolean(activity.distanceM);
  return showsDistance ? `${time} · ${formatDistance(activity.distanceM)}` : time;
};

/** "85 TSS" for a ride with training load (power TSS, else heart-rate TSS), else null. */
export const entryTss = (activity: Activity): string | null => {
  if (!activity.isCycling || !activity.load) return null;
  return `${formatTss(activity.load.tss)} TSS`;
};

/** "Indoor ride", "Outdoor ride", or the sport for other activities. */
export const entryKind = (activity: Activity): string => {
  if (!activity.isCycling) return formatSport(activity.sport);
  return activity.isIndoor ? 'Indoor ride' : 'Outdoor ride';
};

/** "Tue 3" for 2026-11-03. */
export const weekdayAndDay = (date: string): string => {
  const mondayFirstIndex = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return `${WEEKDAYS[mondayFirstIndex]} ${Number(date.slice(8))}`;
};
