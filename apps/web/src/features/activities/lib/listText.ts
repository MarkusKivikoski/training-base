import type { SportScope } from '../constants';

/** "rides" or "activities", for the current sport scope. */
export const activityNoun = (sport: SportScope, count = 2): string => {
  const isOne = count === 1;
  if (sport === 'cycling') return isOne ? 'ride' : 'rides';
  return isOne ? 'activity' : 'activities';
};

/** The results card title: "374 rides", "1 activity match". */
export const resultsTitle = (total: number, sport: SportScope, isFiltered: boolean): string => {
  const suffix = isFiltered ? ' match' : '';
  return `${total} ${activityNoun(sport, total)}${suffix}`;
};

/**
 * A typed distance bound in km. Accepts a decimal comma; empty, negative or unreadable text
 * means no bound.
 */
export const parseKm = (text: string): number | undefined => {
  if (text.trim() === '') return undefined;
  const km = Number(text.replace(',', '.'));
  if (!Number.isFinite(km) || km < 0) return undefined;
  return km;
};
