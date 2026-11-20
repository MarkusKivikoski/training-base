import { useQuery } from '@tanstack/react-query';
import { trpc } from './client';

export const repeatKeys = {
  all: ['repeats'] as const,
  workoutForActivity: (id: string) => [...repeatKeys.all, 'workout', id] as const,
  routeForActivity: (id: string) => [...repeatKeys.all, 'route', id] as const,
  workouts: () => [...repeatKeys.all, 'workouts'] as const,
};

/** The indoor workout one ride belongs to, with every effort on it; null for rides that have none. */
export const useActivityWorkout = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: repeatKeys.workoutForActivity(id),
    queryFn: () => trpc.repeats.workoutForActivity.query({ id }),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Changes only on rebuild, or when a workout is renamed (which invalidates it).
  });

/** The repeated outdoor route one ride followed, with every effort on it; null when it was ridden only once. */
export const useActivityRoute = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: repeatKeys.routeForActivity(id),
    queryFn: () => trpc.repeats.routeForActivity.query({ id }),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Changes only on rebuild, or when a route is renamed (which invalidates it).
  });
