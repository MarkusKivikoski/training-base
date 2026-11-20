import type { Activity } from '@/shared/api/client';
import {
  describeWorkoutType,
  shownWorkoutType,
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
} from '@/shared/lib/workoutTypes';

type WorkoutTypeBadgeProps = {
  activity: Pick<Activity, 'workoutType' | 'workoutTypeOverride'>;
  /** The dot alone, with the label for screen readers and in the tooltip. */
  dotOnly?: boolean;
};

/**
 * A coloured dot and the ride's workout type, with why in the tooltip. A rough type (heart rate
 * only) has a hollow dot. Nothing for rides without a type.
 */
export const WorkoutTypeBadge = ({ activity, dotOnly = false }: WorkoutTypeBadgeProps) => {
  const shown = shownWorkoutType(activity);
  if (!shown) return null;

  const color = WORKOUT_TYPE_COLORS[shown.type];
  const label = WORKOUT_TYPE_LABELS[shown.type];
  const dotStyle = shown.isRough ? { border: `2px solid ${color}`, background: 'transparent' } : { background: color };

  return (
    <span
      title={describeWorkoutType(activity) ?? undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={dotStyle} />
      <span className={dotOnly ? 'sr-only' : 'text-ink-2'}>{label}</span>
    </span>
  );
};
