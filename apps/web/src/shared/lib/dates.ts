const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A Date as a local calendar date, "YYYY-MM-DD". Chart axes put their ticks on local midnights,
 * so reading them in UTC (toISOString) would shift a tick to the previous day.
 */
export const toLocalIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
