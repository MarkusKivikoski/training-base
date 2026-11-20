import { sportParam, type SportParam } from '@/shared/lib/discipline';

/**
 * The reviewed year and sport in the URL; the current year and rides are the defaults and stay out.
 */
export type ReviewSearch = { year?: number; sport?: NonNullable<SportParam> };

/** Years before this aren't plausible ride years. */
const FIRST_YEAR = 1990;

/** The router's `validateSearch` for /review. */
export const validateReviewSearch = (search: Record<string, unknown>): ReviewSearch => {
  const out: ReviewSearch = {};
  const year = Number(search['year']);
  if (Number.isInteger(year) && year > FIRST_YEAR) out.year = year;
  const sport = sportParam(search['sport']);
  if (sport) out.sport = sport;
  return out;
};
