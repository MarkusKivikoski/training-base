import type { RideSlot } from './search';

/** Ride colours on the compare page: A = slot 1, B = slot 5 (orange stays "outdoor" elsewhere). */
export const COMPARE_SLOTS: Record<RideSlot, string> = { a: '--series-1', b: '--series-5' };

/** Rides fetched for the pickers and the suggestions. */
export const RIDE_LIMIT = 1000;

/** At most this many similar rides are suggested. */
export const SIMILAR_RIDES_SHOWN = 8;

/** Outdoor rides count as similar within this share of ride A's distance. */
export const SIMILAR_DISTANCE_TOLERANCE = 0.15;
