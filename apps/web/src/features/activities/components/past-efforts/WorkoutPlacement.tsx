import { useState } from 'react';
import type { RideWorkout } from '@/shared/api/client';
import { usePlaceInWorkout, useWorkouts } from '../../api';
import { workoutOptionLabel } from '../../lib/pastEfforts';

type WorkoutPlacementProps = {
  workout: RideWorkout;
  /** The ride being viewed. */
  activityId: string;
};

const BUTTON_CLASS =
  'rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0 disabled:opacity-50';

/**
 * Fixes for when matching got it wrong: move this ride into another workout, take it out of this
 * one, or hand it back to automatic matching. Folded away until opened.
 */
export const WorkoutPlacement = ({ workout, activityId }: WorkoutPlacementProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const workouts = useWorkouts({ enabled: isOpen });
  const place = usePlaceInWorkout();

  const hasOtherRides = workout.efforts.length > 1;
  const definesWorkoutWithOthers = workout.referenceId === activityId && hasOtherRides;
  const isPlacedByHand = workout.override !== null;
  const canLeave = hasOtherRides && workout.override !== 'own';
  const otherWorkouts = (workouts.data ?? []).filter((candidate) => candidate.id !== workout.id).reverse();

  return (
    <details className="mt-3 text-sm" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-xs text-ink-2 hover:text-ink">Wrong workout?</summary>

      {definesWorkoutWithOthers ? (
        <p className="mt-2 text-xs text-ink-3">
          This is the first ride of the workout, so it defines it. To split the workout, open the other rides and move
          them out.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="workout-target">
            Move this ride to another workout
          </label>
          <select
            id="workout-target"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="max-w-full rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink"
          >
            <option value="">Same workout as…</option>
            {otherWorkouts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {workoutOptionLabel(candidate)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!targetId || place.isPending}
            onClick={() => place.mutate({ activityId, workout: targetId })}
            className={BUTTON_CLASS}
          >
            Move
          </button>
          {canLeave && (
            <button
              type="button"
              disabled={place.isPending}
              onClick={() => place.mutate({ activityId, workout: 'own' })}
              className={BUTTON_CLASS}
            >
              Not this workout
            </button>
          )}
          {isPlacedByHand && (
            <button
              type="button"
              disabled={place.isPending}
              onClick={() => place.mutate({ activityId, workout: null })}
              className={BUTTON_CLASS}
            >
              Match automatically
            </button>
          )}
        </div>
      )}

      {isPlacedByHand && <p className="mt-2 text-xs text-ink-3">This ride was placed by hand.</p>}
      {place.isSuccess && (
        <p className="mt-2 text-xs text-ink-3">Saved. Workouts are being recomputed; this card updates when done.</p>
      )}
      {place.error && (
        <p role="alert" className="mt-2 text-xs text-ink-2">
          Couldn’t move the ride: {place.error.message}
        </p>
      )}
    </details>
  );
};
