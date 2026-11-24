import type { TimeRange } from '@app/metrics';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activityKeys } from '@/shared/api/activities';
import { trpc, type ActivityListInput } from '@/shared/api/client';
import { climbKeys } from '@/shared/api/climbs';
import { noteKeys } from '@/shared/api/notes';
import { recordKeys } from '@/shared/api/records';
import { repeatKeys } from '@/shared/api/repeats';
import { useSettingsMutation } from '@/shared/api/settings';
import type { WorkoutType } from '@/shared/lib/workoutTypes';

export const garminKeys = {
  all: ['garmin'] as const,
  deletedCheck: () => [...garminKeys.all, 'deletedCheck'] as const,
};

/** Paged list for the Activities screen. */
export const useActivityPages = (input: Omit<ActivityListInput, 'cursor'>) =>
  useInfiniteQuery({
    queryKey: activityKeys.pages(input),
    queryFn: ({ pageParam }) => trpc.activities.list.query({ ...input, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

/** Podium places one ride holds in the records (all time and its year). */
export const useActivityRecords = (id: string) =>
  useQuery({
    queryKey: recordKeys.activity(id),
    queryFn: () => trpc.records.forActivity.query({ id }),
    staleTime: Infinity, // Changes only on rebuild.
  });

/** The climbs one ride went up, with its efforts and their ranks. */
export const useActivityClimbs = (id: string) =>
  useQuery({
    queryKey: climbKeys.forActivity(id),
    queryFn: () => trpc.climbs.forActivity.query({ id }),
    staleTime: Infinity,
  });

/** Last check for activities deleted in Garmin Connect (npm run check-deleted). */
export const useGarminCheck = () =>
  useQuery({
    queryKey: garminKeys.deletedCheck(),
    queryFn: () => trpc.garmin.deletedCheck.query(),
    staleTime: Infinity,
  });

/** How one activity felt: its effort rating and note, or null. */
export const useActivityNote = (id: string) =>
  useQuery({ queryKey: noteKeys.activity(id), queryFn: () => trpc.notes.forActivity.query({ id }) });

/** Saves an activity's rating and note; the saved note replaces the cached one. */
export const useSaveActivityNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rpe: number | null; note: string }) => trpc.notes.save.mutate(input),
    onSuccess: (note, input) => queryClient.setQueryData(noteKeys.activity(input.id), note),
  });
};

/**
 * Sets a ride's workout type by hand, or back to the detected one (null). Every activity query
 * refetches, so lists and the ride page show the new type.
 */
export const useSetWorkoutType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; type: WorkoutType | null }) => trpc.workoutTypes.set.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
};

export const intervalKeys = {
  all: ['intervals'] as const,
  activity: (id: string) => [...intervalKeys.all, 'activity', id] as const,
};

/** The ride's work intervals set by hand, or null when it shows the detected ones. */
export const useHandSetIntervals = (id: string) =>
  useQuery({
    queryKey: intervalKeys.activity(id),
    queryFn: () => trpc.intervals.forActivity.query({ id }),
  });

/**
 * Sets a ride's intervals by hand (in time order, none overlapping), or goes back to the detected
 * ones (null). The saved list replaces the cached one; nothing is recomputed.
 */
export const useSetIntervals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; intervals: TimeRange[] | null }) => trpc.intervals.set.mutate(input),
    onSuccess: (intervals, input) => queryClient.setQueryData(intervalKeys.activity(input.id), intervals),
  });
};

/** Every indoor workout, oldest first, for placing a ride in one by hand. */
export const useWorkouts = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: repeatKeys.workouts(),
    queryFn: () => trpc.repeats.workouts.query(),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Changes only on rebuild, or when a workout is renamed (which invalidates it).
  });

/** Names a workout or a route; every repeats query refetches so the new name shows everywhere. */
export const useRenameRepeat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => trpc.repeats.rename.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: repeatKeys.all }),
  });
};

export type WorkoutPlacement = Parameters<typeof trpc.repeats.place.mutate>[0];

/**
 * Places a ride in a workout by hand, on its own, or back to automatic matching. Workouts are
 * recomputed in the background; the page refreshes when that finishes.
 */
export const usePlaceInWorkout = () =>
  useSettingsMutation((input: WorkoutPlacement) => trpc.repeats.place.mutate(input));

export const rideMergeKeys = {
  all: ['rideMerges'] as const,
  candidates: (id: string) => [...rideMergeKeys.all, 'candidates', id] as const,
};

export type MergeCandidate = Awaited<ReturnType<typeof trpc.rideMerges.candidates.query>>[number];

/** Rides recorded just before or after this one that it could be joined with, nearest first. */
export const useMergeCandidates = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: rideMergeKeys.candidates(id),
    queryFn: () => trpc.rideMerges.candidates.query({ id }),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Changes only on rebuild.
  });

/** Joins rides recorded in parts into one. Recomputed in the background; pages refresh when done. */
export const useMergeRides = () =>
  useSettingsMutation((input: { ids: string[] }) => trpc.rideMerges.merge.mutate(input));

/** Splits a merged ride back into its recordings. */
export const useSplitRide = () => useSettingsMutation((input: { id: string }) => trpc.rideMerges.split.mutate(input));
