import type { ActivitySearchPatch } from '../search';

/** The Year control's value when no date range is set. */
export const ALL_YEARS = 'all';

/** The Year control's value for a custom date range: no option is selected. */
export const CUSTOM_RANGE = '';

/** The date filters that cover exactly this calendar year, or clear them for "all". */
export const yearRangePatch = (value: string): ActivitySearchPatch => {
  if (value === ALL_YEARS) return { from: undefined, to: undefined };
  return { from: `${value}-01-01`, to: `${value}-12-31` };
};

/** Which Year option the date filters match: a year, "all", or none for any other range. */
export const selectedYearValue = (from: string | undefined, to: string | undefined): string => {
  if (!from && !to) return ALL_YEARS;
  const year = from?.slice(0, 4);
  const isWholeYear = from === `${year}-01-01` && to === `${year}-12-31`;
  return isWholeYear && year ? year : CUSTOM_RANGE;
};

/** "All" followed by the years, newest first. */
export const yearOptions = (years: ReadonlyArray<number>) => {
  const newestFirst = [...years].sort((first, second) => second - first);
  const yearEntries = newestFirst.map((year) => ({ value: String(year), label: String(year) }));
  return [{ value: ALL_YEARS, label: 'All' }, ...yearEntries];
};
