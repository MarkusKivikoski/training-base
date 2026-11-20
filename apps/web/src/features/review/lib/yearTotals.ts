import type { YearTotals } from '@app/metrics';
import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { formatDate, formatDistance, formatElevation, formatHours, formatShortDate } from '@/shared/lib/formatters';

/** "+120 km (+12%) vs 2025", "new vs 2025", or null when both years are zero. */
export const changeText = (
  now: number,
  before: number,
  previousYear: number,
  format: (size: number) => string,
): string | null => {
  if (before === 0 && now === 0) return null;
  if (before === 0) return `new vs ${previousYear}`;

  const difference = now - before;
  const percent = Math.round((difference / before) * 100);
  const sign = difference >= 0 ? '+' : '−';
  const percentSign = percent >= 0 ? '+' : '−';
  return `${sign}${format(Math.abs(difference))} (${percentSign}${Math.abs(percent)}%) vs ${previousYear}`;
};

export type TotalTile = { label: string; value: string; change: string | null };

const capitalised = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

/** The headline totals of rides (or runs) with their change against the year before. */
export const totalTiles = (
  now: YearTotals,
  before: YearTotals,
  previousYear: number,
  discipline: Discipline = 'cycling',
): TotalTile[] => {
  const words = DISCIPLINE_WORDS[discipline];
  const tile = (
    label: string,
    value: string,
    nowValue: number,
    beforeValue: number,
    format: (n: number) => string,
  ) => ({
    label,
    value,
    change: changeText(nowValue, beforeValue, previousYear, format),
  });

  return [
    tile(words.titleMany, String(now.rides), now.rides, before.rides, String),
    tile(`${capitalised(words.doing)} time`, formatHours(now.movingS), now.movingS, before.movingS, formatHours),
    tile('Distance', formatDistance(now.distanceM, 0), now.distanceM, before.distanceM, (m) => formatDistance(m, 0)),
    tile('Climbing', formatElevation(now.elevationM), now.elevationM, before.elevationM, formatElevation),
    tile('Gym workouts', String(now.gym), now.gym, before.gym, String),
    tile('Active days', String(now.activeDays), now.activeDays, before.activeDays, String),
  ];
};

/** Whether `today` falls in `year`, so it's compared with the same part of the year before. */
export const isYearInProgress = (year: number, today: string) => today.startsWith(`${year}-`);

/** What the year is compared with: "2025", or "2025 by 9.11." for a year in progress. */
export const comparisonLabel = (year: number, today: string): string => {
  const previousYear = year - 1;
  if (!isYearInProgress(year, today)) return String(previousYear);
  return `${previousYear} by ${formatShortDate(`${previousYear}-${today.slice(5)}`)}`;
};

/** The sentence under the heading. */
export const periodNote = (year: number, today: string): string =>
  isYearInProgress(year, today)
    ? `So far, through ${formatDate(today)}, compared with the same part of ${year - 1}.`
    : `The whole year, compared with ${year - 1}.`;

export type MixRow = { label: string; count: number; percent: number };

/** Activities by type with their share, types without any left out. */
export const activityMix = (totals: YearTotals): MixRow[] => {
  const counts = [
    { label: 'Outdoor rides', count: totals.outdoorRides },
    { label: 'Indoor rides', count: totals.indoorRides },
    { label: 'Strength', count: totals.others.strength },
    { label: 'Running', count: totals.others.running },
    { label: 'Skiing', count: totals.others.skiing },
    { label: 'Other', count: totals.others.other },
  ].filter((row) => row.count > 0);

  let total = 0;
  for (const row of counts) total += row.count;
  return counts.map((row) => ({ ...row, percent: (row.count / total) * 100 }));
};
