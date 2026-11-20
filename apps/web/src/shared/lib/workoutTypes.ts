import { WORKOUT_TYPES, type WorkoutType } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { formatDurationLabel } from './formatters';

export { WORKOUT_TYPES, type WorkoutType };

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  recovery: 'Recovery',
  endurance: 'Endurance',
  tempo: 'Tempo',
  sweetSpot: 'Sweet spot',
  threshold: 'Threshold',
  vo2max: 'VO₂ max',
  anaerobic: 'Anaerobic',
  mixed: 'Mixed / race',
};

/** The CSS colour token of each type's dot (styles.css). */
export const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  recovery: 'var(--workout-recovery)',
  endurance: 'var(--workout-endurance)',
  tempo: 'var(--workout-tempo)',
  sweetSpot: 'var(--workout-sweet-spot)',
  threshold: 'var(--workout-threshold)',
  vo2max: 'var(--workout-vo2max)',
  anaerobic: 'var(--workout-anaerobic)',
  mixed: 'var(--workout-mixed)',
};

/** The type a ride shows: the one set by hand, else the detected one. */
export type ShownWorkoutType = {
  type: WorkoutType;
  /** Set by hand rather than detected. */
  isManual: boolean;
  /** Detected from heart rate only, so only a rough type. */
  isRough: boolean;
};

type WorkoutTypeFields = Pick<Activity, 'workoutType' | 'workoutTypeOverride'>;

export const shownWorkoutType = ({ workoutType, workoutTypeOverride }: WorkoutTypeFields): ShownWorkoutType | null => {
  if (workoutTypeOverride) return { type: workoutTypeOverride, isManual: true, isRough: false };
  if (!workoutType) return null;
  return { type: workoutType.type, isManual: false, isRough: workoutType.basis === 'hr' };
};

/** Detected repetitions are a few seconds off the planned ones: 238 s reads as "4 min". */
const roundRepLength = (seconds: number): number => {
  const step = seconds < 120 ? 5 : 30;
  return Math.round(seconds / step) * step;
};

/** Why a ride shows its type, for a tooltip: "Threshold: 2 × 20 min at 97 % of FTP". */
export const describeWorkoutType = (activity: WorkoutTypeFields): string | null => {
  const shown = shownWorkoutType(activity);
  if (!shown) return null;
  const label = WORKOUT_TYPE_LABELS[shown.type];
  if (shown.isManual) return `${label}: set by hand`;

  const reps = activity.workoutType?.reps;
  if (reps) {
    const length = formatDurationLabel(roundRepLength(reps.durationS));
    const percent = Math.round(reps.intensity * 100);
    return `${label}: ${reps.count} × ${length} at ${percent} % of FTP`;
  }
  if (shown.isRough) return `${label}: rough type, from heart rate only`;
  return `${label}: from time in power zones`;
};
