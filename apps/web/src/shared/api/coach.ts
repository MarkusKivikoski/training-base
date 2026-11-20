import { weightOnDate } from '@app/metrics';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { coachMinutes } from '@/shared/coach/coachDetail';
import { formBefore, type CoachRide } from '@/shared/coach/coachText';
import { lapRows } from '@/shared/lib/rangeRows';
import { activityKeys } from './activities';
import { trpc, type Activity } from './client';
import { loadKeys } from './load';
import { noteKeys } from './notes';
import { settingsKeys } from './settings';

/** The most activities copied for the coach at once; more would swamp the chat. */
export const MAX_COACH_RIDES = 50;

/**
 * Loads what the coach text needs for the given activities: laps from each stream (and per-minute
 * power and HR for a single ride), the rating and note, weight and the training load going in.
 * Streams and notes share the detail page's cache, so copying a ride you're looking at fetches
 * nothing new.
 */
export const useLoadCoachRides = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (activities: readonly Activity[]): Promise<CoachRide[]> => {
      // Per-minute data is only worth its size for one ride; for many it would swamp the chat.
      const includeMinutes = activities.length === 1;
      const [settings, load] = await Promise.all([
        queryClient.fetchQuery({ queryKey: settingsKeys.current(), queryFn: () => trpc.settings.current.query() }),
        queryClient.fetchQuery({ queryKey: loadKeys.daily({}), queryFn: () => trpc.load.daily.query({}) }),
      ]);

      const loadRide = async (activity: Activity): Promise<CoachRide> => {
        const [stream, note] = await Promise.all([
          queryClient
            .fetchQuery({
              queryKey: activityKeys.streams(activity.id),
              queryFn: () => trpc.activities.streams.query({ id: activity.id }),
              staleTime: Infinity,
            })
            // A ride without a stream file still gets its summary, just no laps.
            .catch(() => null),
          queryClient.fetchQuery({
            queryKey: noteKeys.activity(activity.id),
            queryFn: () => trpc.notes.forActivity.query({ id: activity.id }),
          }),
        ]);
        return {
          activity,
          laps: stream ? lapRows(stream) : [],
          minutes: includeMinutes && stream ? coachMinutes(stream) : null,
          rpe: note?.rpe ?? null,
          note: note?.note?.trim() || null,
          weightKg: weightOnDate(settings.weightHistory, activity.date),
          form: activity.isCycling ? formBefore(load.days, activity.date) : null,
        };
      };

      return Promise.all(activities.slice(0, MAX_COACH_RIDES).map(loadRide));
    },
    [queryClient],
  );
};
