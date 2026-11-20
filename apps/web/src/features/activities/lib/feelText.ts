import { rpeLoad } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { formatTss } from '@/shared/lib/formatters';

/** Words for each point of the 1–10 effort scale. */
export const RPE_LABELS: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Easy',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Somewhat hard',
  7: 'Hard',
  8: 'Very hard',
  9: 'Very hard',
  10: 'All-out',
};

export const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Whether the activity has no load from heart rate or power, so a rating is the only way to estimate one. */
export const hasNoMeasuredLoad = (activity: Activity): boolean =>
  activity.hrLoad === null && (activity.metrics?.tss ?? null) === null;

/** "About 45 TSS from your rating", or null when there's no rating or a measured load exists. */
export const ratingLoadText = (activity: Activity, rpe: number | null): string | null => {
  if (rpe === null || !hasNoMeasuredLoad(activity)) return null;
  const durationS = activity.movingDurationS ?? activity.durationS;
  return `About ${formatTss(rpeLoad(rpe, durationS))} TSS from your rating`;
};
