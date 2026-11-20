import { TRPCError } from '@trpc/server';
import { repeatGroupIdSchema, workoutOverrideSchema, type ActivityNote, type WorkoutGroup } from '@app/shared';
import { z } from 'zod';
import { t } from '../trpc.js';

const activityIdInput = z.string().regex(/^[1-9][0-9]*$/);

/** A workout without its efforts' numbers: enough to list it and to label it. */
function workoutSummary(workout: WorkoutGroup, names: Record<string, string>) {
  return {
    id: workout.id,
    name: names[workout.id] ?? null,
    referenceId: workout.referenceId,
    durationS: workout.durationS,
    blocks: workout.blocks,
    efforts: workout.efforts.length,
    firstDate: workout.efforts[0]!.date,
    lastDate: workout.efforts.at(-1)!.date,
  };
}

/** How each of the given rides felt: effort ratings (1–10) by activity id, from the rides' notes. */
function ratingsOf(efforts: ReadonlyArray<{ activityId: string }>, notes: Record<string, ActivityNote>) {
  const ratings: Record<string, number> = {};
  for (const effort of efforts) {
    const rpe = notes[effort.activityId]?.rpe;
    if (rpe !== undefined) ratings[effort.activityId] = rpe;
  }
  return ratings;
}

/**
 * Repeated indoor workouts and outdoor routes from derived/repeats.json, with the names and
 * placements the user set.
 */
export const repeatsRouter = t.router({
  /**
   * The workout one ride belongs to, with every effort on it, how each felt (the effort ratings
   * from settings/activity-notes.json) and where the ride was placed by hand. Null for rides that
   * aren't indoor rides with power.
   */
  workoutForActivity: t.procedure.input(z.object({ id: activityIdInput })).query(async ({ ctx, input }) => {
    const [file, groups, notes] = await Promise.all([
      ctx.repeats.read(),
      ctx.settings.readRideGroups(),
      ctx.settings.readActivityNotes(),
    ]);
    const workout = file.workouts.find((candidate) =>
      candidate.efforts.some((effort) => effort.activityId === input.id),
    );
    if (!workout) return null;

    return {
      ...workout,
      name: groups.names[workout.id] ?? null,
      ratings: ratingsOf(workout.efforts, notes),
      /** Where this ride was placed by hand, if it was. */
      override: groups.workoutOverrides[input.id] ?? null,
    };
  }),

  /**
   * The repeated route one outdoor ride followed, with every effort on it and how each felt. Null
   * for rides whose route has been ridden only once.
   */
  routeForActivity: t.procedure.input(z.object({ id: activityIdInput })).query(async ({ ctx, input }) => {
    const [file, groups, notes] = await Promise.all([
      ctx.repeats.read(),
      ctx.settings.readRideGroups(),
      ctx.settings.readActivityNotes(),
    ]);
    const route = file.routes.find((candidate) => candidate.efforts.some((effort) => effort.activityId === input.id));
    if (!route) return null;
    return { ...route, name: groups.names[route.id] ?? null, ratings: ratingsOf(route.efforts, notes) };
  }),

  /** Every workout, oldest first, for placing a ride in one by hand. */
  workouts: t.procedure.query(async ({ ctx }) => {
    const [file, groups] = await Promise.all([ctx.repeats.read(), ctx.settings.readRideGroups()]);
    return file.workouts.map((workout) => workoutSummary(workout, groups.names));
  }),

  /** Names a workout or a route (settings/ride-groups.json); an empty name removes it. Nothing is recomputed. */
  rename: t.procedure
    .input(z.object({ id: repeatGroupIdSchema, name: z.string().max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.settings.setRideGroupName(input.id, input.name);
      return { id: input.id, name: input.name.trim() || null };
    }),

  /**
   * Places a ride by hand: in a workout, on its "own" (out of every other ride's workout), or
   * null to let matching decide again. Then recomputes derived data in the background and returns
   * the job status. The ride that defines a workout with other rides in it can't be moved.
   */
  place: t.procedure
    .input(z.object({ activityId: activityIdInput, workout: workoutOverrideSchema.nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { workouts } = await ctx.repeats.read();
      const current = workouts.find((candidate) =>
        candidate.efforts.some((effort) => effort.activityId === input.activityId),
      );
      if (!current) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only indoor rides with power can be placed in a workout.',
        });
      }

      const definesWorkoutWithOthers = current.referenceId === input.activityId && current.efforts.length > 1;
      if (definesWorkoutWithOthers && input.workout !== null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This ride defines its workout. Move the other rides out of it instead.',
        });
      }

      const isWorkoutId = input.workout !== null && input.workout !== 'own';
      if (isWorkoutId && !workouts.some((candidate) => candidate.id === input.workout)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That workout doesn’t exist.' });
      }

      await ctx.settings.setWorkoutOverride(input.activityId, input.workout);
      return ctx.syncJob.requestRebuild();
    }),
});
