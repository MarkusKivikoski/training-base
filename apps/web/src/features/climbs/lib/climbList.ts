import type { ClimbSummary } from '@/shared/api/client';

export type SortKey = 'rides' | 'score' | 'lengthM' | 'avgGrade' | 'maxGrade' | 'lastDate';

/** A climb counts as recurring once it has been ridden on two rides. */
const RECURRING_RIDES = 2;

export const isRecurring = (climb: ClimbSummary) => climb.rides >= RECURRING_RIDES;

/** Highest first for numbers, newest first for the date. */
const compareBy = (first: ClimbSummary, second: ClimbSummary, key: SortKey): number => {
  if (key === 'lastDate') return second.lastDate.localeCompare(first.lastDate);
  return second[key] - first[key];
};

/** The climbs to list, sorted descending by `sort`; ties go to the climb with more efforts. */
export const listedClimbs = (climbs: readonly ClimbSummary[], showAll: boolean, sort: SortKey): ClimbSummary[] => {
  const shown = showAll ? [...climbs] : climbs.filter(isRecurring);
  return shown.sort((first, second) => compareBy(first, second, sort) || second.efforts - first.efforts);
};

/** "650 m" under a kilometre, else "1.62 km". */
export const climbLengthText = (metres: number): string =>
  metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(2)} km`;
