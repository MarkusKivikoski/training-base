import type { Activity } from '@/shared/api/client';

/** Rides need about this long (warm-up plus an hour) before decoupling is worth explaining. */
const LONG_ENOUGH_S = 70 * 60;

/**
 * Why a long ride has no decoupling value, or null when it has one or isn't a long ride (short
 * rides just don't show the stat).
 */
export const decouplingMissingReason = (activity: Activity): string | null => {
  if (activity.decoupling || !activity.isCycling) return null;
  if ((activity.movingDurationS ?? activity.durationS) < LONG_ENOUGH_S) return null;
  if (activity.avgHr === null) return 'No heart rate recorded.';
  if (activity.isIndoor && !activity.hasPower) return 'Indoor ride without power: trainer speed is virtual.';
  if (activity.hasPower) return 'Not a steady ride (variability index over 1.10), so it wouldn’t mean much.';
  return 'Too hilly for speed-based decoupling (over 10 m of climbing per km).';
};
