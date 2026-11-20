import { workoutTypeSchema, type ActivitySummary, type WorkoutType } from '@app/shared';
import { z } from 'zod';
import { t } from '../trpc.js';

/** An activity as served: its summary plus the workout type set by hand, if one was. */
export function withWorkoutTypeOverride(
  activity: ActivitySummary,
  overrides: Record<string, WorkoutType>,
): ActivitySummary & { workoutTypeOverride: WorkoutType | null } {
  return { ...activity, workoutTypeOverride: overrides[activity.id] ?? null };
}

/** Workout types set by hand (settings/workout-types.json), for rides the detection got wrong. */
export const workoutTypesRouter = t.router({
  /** Sets a ride's type by hand; null goes back to the detected type. Nothing is recomputed. */
  set: t.procedure
    .input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/), type: workoutTypeSchema.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.settings.setWorkoutTypeOverride(input.id, input.type);
      return { id: input.id, type: input.type };
    }),
});
