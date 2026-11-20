import { TRPCError } from '@trpc/server';
import type { ActivitySummary, RideMerge } from '@app/shared';
import { z } from 'zod';
import { t } from '../trpc.js';

/** Recordings further apart than this are separate rides, not one ride stopped by accident. */
export const MAX_MERGE_GAP_S = 12 * 3600;

/** Start times are whole seconds and devices differ slightly, so a small overlap still counts as consecutive. */
const OVERLAP_TOLERANCE_S = 60;

const activityId = z.string().regex(/^[1-9][0-9]*$/);

/** One recording on the clock: when it started (ms) and how long it ran. */
interface RecordingTime {
  id: string;
  startMs: number;
  durationS: number;
}

/** The recordings behind an activity in the index: its parts for a merged ride, else itself. */
function recordingsOf(activity: ActivitySummary): RecordingTime[] {
  const startMs = Date.parse(activity.startTimeUtc);
  if (!activity.mergedFrom) return [{ id: activity.id, startMs, durationS: activity.durationS }];
  return activity.mergedFrom.map((part) => ({
    id: part.id,
    startMs: startMs + part.startS * 1000,
    durationS: part.durationS,
  }));
}

const endMs = (recording: RecordingTime) => recording.startMs + recording.durationS * 1000;

/** Seconds from the end of `earlier` to the start of `later`; negative when they overlap. */
const gapS = (earlier: RecordingTime, later: RecordingTime) => Math.round((later.startMs - endMs(earlier)) / 1000);

const isJoinableGap = (seconds: number) => seconds >= -OVERLAP_TOLERANCE_S && seconds <= MAX_MERGE_GAP_S;

/** Rides only, all indoor or all outdoor. */
const canJoin = (a: ActivitySummary, b: ActivitySummary) => a.isCycling && b.isCycling && a.isIndoor === b.isIndoor;

/**
 * Why these activities can't be joined into one ride, or null when they can: they must be rides of
 * the same kind (indoor or outdoor), recorded one after the other within MAX_MERGE_GAP_S.
 */
export function mergeProblem(activities: readonly ActivitySummary[]): string | null {
  const [first] = activities;
  if (!first || activities.length < 2) return 'Choose at least two rides to merge.';
  if (!activities.every((activity) => activity.isCycling)) return 'Only rides can be merged.';
  if (!activities.every((activity) => canJoin(first, activity))) {
    return 'Indoor and outdoor rides can’t be merged together.';
  }
  const recordings = activities.flatMap(recordingsOf).sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < recordings.length; i++) {
    const gap = gapS(recordings[i - 1]!, recordings[i]!);
    if (gap < -OVERLAP_TOLERANCE_S) return 'These rides overlap in time, so they weren’t one ride stopped by accident.';
    if (gap > MAX_MERGE_GAP_S) return 'These rides are more than 12 hours apart.';
  }
  return null;
}

/** The recordings' ids, earliest first: the order settings/ride-merges.json keeps. */
const mergeOrder = (activities: readonly ActivitySummary[]): RideMerge =>
  activities
    .flatMap(recordingsOf)
    .sort((a, b) => a.startMs - b.startMs)
    .map((recording) => recording.id);

/**
 * Rides recorded in several parts (recording stopped by accident), joined into one at rebuild
 * (settings/ride-merges.json). Garmin keeps the parts; merging and splitting are recomputed in the
 * background, like other settings changes.
 */
export const rideMergesRouter = t.router({
  /** Rides that could be joined with this one: same kind, just before or after it, nearest first. */
  candidates: t.procedure.input(z.object({ id: activityId })).query(async ({ ctx, input }) => {
    const { activities } = await ctx.index.get();
    const activity = activities.find((candidate) => candidate.id === input.id);
    if (!activity) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${input.id} not found` });
    if (!activity.isCycling) return [];

    const own = recordingsOf(activity);
    const ownFirst = own[0]!;
    const ownLast = own.at(-1)!;
    const candidates = [];
    for (const other of activities) {
      if (other.id === activity.id || !canJoin(activity, other)) continue;
      const theirs = recordingsOf(other);
      const isBefore = theirs[0]!.startMs < ownFirst.startMs;
      const gap = isBefore ? gapS(theirs.at(-1)!, ownFirst) : gapS(ownLast, theirs[0]!);
      if (!isJoinableGap(gap)) continue;
      candidates.push({
        id: other.id,
        name: other.name,
        startTimeLocal: other.startTimeLocal,
        durationS: other.durationS,
        distanceM: other.distanceM,
        gapS: Math.max(0, gap),
        isBefore,
      });
    }
    return candidates.sort((a, b) => a.gapS - b.gapS);
  }),

  /**
   * Joins rides into one, kept under the earliest recording's id. A ride that is already a merge
   * brings all its recordings along.
   */
  merge: t.procedure.input(z.object({ ids: z.array(activityId).min(2).max(10) })).mutation(async ({ ctx, input }) => {
    const { activities } = await ctx.index.get();
    const chosen: ActivitySummary[] = [];
    for (const id of new Set(input.ids)) {
      const activity = activities.find((candidate) => candidate.id === id);
      if (!activity) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${id} not found` });
      chosen.push(activity);
    }
    const problem = mergeProblem(chosen);
    if (problem) throw new TRPCError({ code: 'BAD_REQUEST', message: problem });

    const merge = mergeOrder(chosen);
    const isInNewMerge = (id: string) => merge.includes(id);
    const others = (await ctx.settings.readRideMerges()).filter((existing) => !existing.some(isInNewMerge));
    await ctx.settings.writeRideMerges([...others, merge]);
    return ctx.syncJob.requestRebuild();
  }),

  /** Splits a merged ride back into its recordings. */
  split: t.procedure.input(z.object({ id: activityId })).mutation(async ({ ctx, input }) => {
    const merges = await ctx.settings.readRideMerges();
    const remaining = merges.filter((merge) => merge[0] !== input.id);
    if (remaining.length === merges.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This ride isn’t merged.' });
    }
    await ctx.settings.writeRideMerges(remaining);
    return ctx.syncJob.requestRebuild();
  }),
});
