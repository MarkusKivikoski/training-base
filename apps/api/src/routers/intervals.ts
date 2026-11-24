import { handSetIntervalsSchema } from '@app/shared';
import { z } from 'zod';
import { t } from '../trpc.js';

const activityId = z.string().regex(/^[1-9][0-9]*$/);

/**
 * Work intervals set by hand (settings/intervals.json), for rides where detection missed an
 * effort, found one that wasn't, or placed its edges badly. Detection itself runs in the web app.
 */
export const intervalsRouter = t.router({
  /** The ride's intervals set by hand, or null when it shows the detected ones. */
  forActivity: t.procedure
    .input(z.object({ id: activityId }))
    .query(async ({ ctx, input }) => (await ctx.settings.readIntervalOverrides())[input.id] ?? null),

  /**
   * Replaces the ride's intervals (in time order, none overlapping; empty for none); null goes
   * back to the detected ones. Nothing is recomputed.
   */
  set: t.procedure
    .input(z.object({ id: activityId, intervals: handSetIntervalsSchema.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.settings.setIntervalOverride(input.id, input.intervals);
      return input.intervals;
    }),
});
