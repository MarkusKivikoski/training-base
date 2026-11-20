export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Activities fetched for the year and the year before. */
export const ACTIVITY_LIMIT = 1000;

/** Duration (s) of the power best shown in the highlights. */
export const HIGHLIGHT_POWER_S = 1200;

/** Distances (m) of the fastest efforts shown in a year of runs. */
export const HIGHLIGHT_RUN_DISTANCES_M = [5_000, 10_000] as const;
