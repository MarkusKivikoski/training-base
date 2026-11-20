import type { Activity } from '@/shared/api/client';
import { formatDate, formatDistance } from '@/shared/lib/formatters';
import { SIMILAR_DISTANCE_TOLERANCE, SIMILAR_RIDES_SHOWN } from '../constants';

/** "7.11.2026 · Evening loop · 42 km" (no distance for indoor rides). */
export const rideLabel = (ride: Activity): string => {
  const base = `${formatDate(ride.date)} · ${ride.name}`;
  const showsDistance = Boolean(ride.distanceM) && !ride.isIndoor;
  return showsDistance ? `${base} · ${formatDistance(ride.distanceM)}` : base;
};

const isSimilarDistance = (ride: Activity, other: Activity) => {
  if (!ride.distanceM || !other.distanceM) return false;
  const difference = Math.abs(other.distanceM - ride.distanceM) / ride.distanceM;
  return difference <= SIMILAR_DISTANCE_TOLERANCE;
};

/**
 * Rides like `ride`: same sport and indoor/outdoor, distance within ±15 % (any distance
 * indoors), in the order given (newest first).
 */
export const similarRides = (ride: Activity, rides: readonly Activity[]): Activity[] => {
  const similar = rides.filter((other) => {
    const isSameKind = other.id !== ride.id && other.sport === ride.sport && other.isIndoor === ride.isIndoor;
    if (!isSameKind) return false;
    return ride.isIndoor || isSimilarDistance(ride, other);
  });
  return similar.slice(0, SIMILAR_RIDES_SHOWN);
};

/**
 * The other rides of the workout or route `ride` belongs to, in the order given (newest first).
 * `matchedRideIds` are the ids of every ride of that workout or route.
 */
export const matchedRides = (
  ride: Activity,
  rides: readonly Activity[],
  matchedRideIds: readonly string[],
): Activity[] => rides.filter((other) => other.id !== ride.id && matchedRideIds.includes(other.id));

/** Rides grouped by year for the picker, keeping their order. */
export const ridesByYear = (rides: readonly Activity[]): Array<{ year: string; rides: Activity[] }> => {
  const groups: Array<{ year: string; rides: Activity[] }> = [];
  for (const ride of rides) {
    const year = ride.date.slice(0, 4);
    let group = groups.find((existing) => existing.year === year);
    if (!group) {
      group = { year, rides: [] };
      groups.push(group);
    }
    group.rides.push(ride);
  }
  return groups;
};
