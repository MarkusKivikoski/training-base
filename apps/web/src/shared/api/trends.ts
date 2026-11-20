import { useQuery } from '@tanstack/react-query';
import { trpc } from './client';

export const trendsKeys = {
  all: ['trends'] as const,
};

/** Long-term volume and fitness markers (derived/trends.json). */
export const useTrends = () =>
  useQuery({ queryKey: trendsKeys.all, queryFn: () => trpc.trends.get.query(), staleTime: Infinity });
