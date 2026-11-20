import type { RideClimb } from '@/shared/api/client';

export type ClimbEffortRow = {
  climb: RideClimb['climb'];
  effort: RideClimb['efforts'][number];
};

/** One row per effort, in ride order (a climb can be ridden more than once on a ride). */
export const climbEffortRows = (rideClimbs: readonly RideClimb[]): ClimbEffortRow[] =>
  rideClimbs.flatMap(({ climb, efforts }) => efforts.map((effort) => ({ climb, effort })));

/** Efforts that are the best time on a climb ridden more than once. */
export const bestTimeCount = (rows: readonly ClimbEffortRow[]): number =>
  rows.filter(({ climb, effort }) => effort.rank === 1 && climb.efforts > 1).length;

/** "Climbs", or "Climbs · 2 best times". */
export const climbsCardTitle = (bestTimes: number): string => {
  if (bestTimes === 0) return 'Climbs';
  const noun = bestTimes === 1 ? 'time' : 'times';
  return `Climbs · ${bestTimes} best ${noun}`;
};
