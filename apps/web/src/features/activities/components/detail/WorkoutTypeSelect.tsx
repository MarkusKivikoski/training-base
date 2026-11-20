import type { Activity } from '@/shared/api/client';
import { WORKOUT_TYPE_LABELS, WORKOUT_TYPES, type WorkoutType } from '@/shared/lib/workoutTypes';
import { WorkoutTypeBadge } from '@/shared/ui/WorkoutTypeBadge';
import { useSetWorkoutType } from '../../api';

type WorkoutTypeSelectProps = {
  activity: Activity;
};

/** Value of the "detected" option; anything else is a workout type. */
const DETECTED = '';

const isWorkoutType = (value: string): value is WorkoutType => (WORKOUT_TYPES as readonly string[]).includes(value);

/** The ride's workout type: the detected one (the default), or one set by hand when detection got it wrong. */
export const WorkoutTypeSelect = ({ activity }: WorkoutTypeSelectProps) => {
  const setWorkoutType = useSetWorkoutType();
  if (!activity.isCycling) return null;

  const detectedLabel = activity.workoutType ? WORKOUT_TYPE_LABELS[activity.workoutType.type] : 'none';
  const value = activity.workoutTypeOverride ?? DETECTED;

  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <WorkoutTypeBadge activity={activity} dotOnly />
      Type
      <select
        value={value}
        disabled={setWorkoutType.isPending}
        onChange={(event) => {
          const chosen = event.target.value;
          setWorkoutType.mutate({ id: activity.id, type: isWorkoutType(chosen) ? chosen : null });
        }}
        className="rounded-lg border border-line bg-surface-1 px-2 py-1 text-sm text-ink"
      >
        <option value={DETECTED}>Detected ({detectedLabel})</option>
        {WORKOUT_TYPES.map((type) => (
          <option key={type} value={type}>
            {WORKOUT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
  );
};
