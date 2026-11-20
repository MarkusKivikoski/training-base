import { useQuery } from '@tanstack/react-query';
import { trpc, type ActivityListInput } from './client';

type DateRange = { from?: string; to?: string };

export const activityKeys = {
  all: ['activities'] as const,
  list: (input: ActivityListInput) => [...activityKeys.all, 'list', input] as const,
  pages: (input: Omit<ActivityListInput, 'cursor'>) => [...activityKeys.all, 'pages', input] as const,
  detail: (id: string) => [...activityKeys.all, 'get', id] as const,
  streams: (id: string) => [...activityKeys.all, 'streams', id] as const,
  meanMax: (range: DateRange | null) => [...activityKeys.all, 'meanMax', range] as const,
};

const isNotFound = (err: unknown, pattern: RegExp) => err instanceof Error && pattern.test(err.message);

export const useActivities = (input: ActivityListInput, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: activityKeys.list(input),
    queryFn: () => trpc.activities.list.query(input),
    enabled: options.enabled ?? true,
  });

export const useActivity = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => trpc.activities.get.query({ id }),
    enabled: options.enabled ?? true,
    retry: (count, err) => !isNotFound(err, /not found/i) && count < 2,
  });

export const useActivityStreams = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: activityKeys.streams(id),
    queryFn: () => trpc.activities.streams.query({ id }),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Streams only change on rebuild.
    retry: (count, err) => !isNotFound(err, /no streams/i) && count < 2,
  });

/** Mean-max curves for powered rides in a date range (undefined bounds = open; null = don't fetch). */
export const useMeanMax = (range: DateRange | null) =>
  useQuery({
    queryKey: activityKeys.meanMax(range),
    queryFn: () => trpc.activities.meanMax.query(range ?? {}),
    enabled: range !== null,
  });
