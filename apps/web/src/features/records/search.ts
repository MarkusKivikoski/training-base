import { sportParam, type SportParam } from '@/shared/lib/discipline';

/**
 * Records in the URL: the period is a year, or all time (the default, left out); the sport is
 * runs, or rides (the default, left out).
 */
export type RecordsSearch = { year?: number; sport?: NonNullable<SportParam> };

/** Years before this aren't plausible ride years. */
const FIRST_YEAR = 1990;

/** The router's `validateSearch` for /records. */
export const validateRecordsSearch = (search: Record<string, unknown>): RecordsSearch => {
  const out: RecordsSearch = {};
  const year = Number(search['year']);
  if (Number.isInteger(year) && year > FIRST_YEAR) out.year = year;
  const sport = sportParam(search['sport']);
  if (sport) out.sport = sport;
  return out;
};
