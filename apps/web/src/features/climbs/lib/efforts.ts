import type { ClimbDetail } from '@/shared/api/client';

export type ClimbEffort = ClimbDetail['efforts'][number];

export type EffortOrder = 'fastest' | 'recent';

/** Times are capped at this multiple of the median, so one effort with a long stop can't flatten the rest. */
const CAP_MEDIAN_MULTIPLE = 2.5;
/** The cap is rounded up to whole half-minutes. */
const CAP_STEP_S = 30;

/** The highest time the history chart shows; slower efforts sit at the cap. */
export const historyTimeCap = (efforts: readonly ClimbEffort[]): number => {
  const times = efforts.map((effort) => effort.timeS).sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const roundedCap = Math.ceil((median * CAP_MEDIAN_MULTIPLE) / CAP_STEP_S) * CAP_STEP_S;
  return Math.min(times.at(-1)!, roundedCap);
};

/** Fastest first, or newest first (later efforts on the same ride first). */
export const sortedEfforts = (efforts: readonly ClimbEffort[], order: EffortOrder): ClimbEffort[] => {
  const sorted = [...efforts];
  if (order === 'fastest') return sorted.sort((first, second) => first.rank - second.rank);
  return sorted.sort((first, second) => second.date.localeCompare(first.date) || second.startS - first.startS);
};

/** How many different rides went up the climb. */
export const rideCount = (efforts: readonly ClimbEffort[]): number =>
  new Set(efforts.map((effort) => effort.activityId)).size;

/** Local month and year, "6.2024" (January shows just the year). */
export const monthYear = (date: Date): string =>
  date.getMonth() === 0 ? String(date.getFullYear()) : `${date.getMonth() + 1}.${date.getFullYear()}`;
