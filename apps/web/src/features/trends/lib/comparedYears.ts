import type { Trends } from '@/shared/api/client';

type Year = Trends['years'][number];

/**
 * The first year, if the synced data starts after January. A year that starts mid-way would
 * draw a misleadingly small total, so it's left out of year over year.
 */
export const partialFirstYear = (months: Trends['months']): number | null => {
  const firstMonth = months[0]?.month;
  if (!firstMonth || firstMonth.endsWith('-01')) return null;
  return Number(firstMonth.slice(0, 4));
};

/** The years to compare: all but a partial first year. */
export const comparedYears = (years: readonly Year[], partialYear: number | null): Year[] =>
  years.filter((year) => year.year !== partialYear);

/** "+120 km", "−3 rides": this year's total so far against another year's by the same date. */
export const differenceText = (difference: number, short: (value: number) => string): string => {
  const sign = difference >= 0 ? '+' : '−';
  const size = Math.abs(Math.round(difference * 10) / 10);
  return `${sign}${short(size)}`;
};
