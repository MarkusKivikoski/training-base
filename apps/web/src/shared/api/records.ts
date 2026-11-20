import { useQuery } from '@tanstack/react-query';
import type { Discipline } from '@/shared/lib/discipline';
import { trpc } from './client';

export const recordKeys = {
  all: ['records'] as const,
  scope: (year: number | undefined, discipline: Discipline) => [...recordKeys.all, discipline, year ?? 'all'] as const,
  activity: (id: string) => [...recordKeys.all, 'activity', id] as const,
};

/** Personal records for one year, or all time when `year` is undefined. Ride records unless runs are asked for. */
export const useRecords = (year: number | undefined, discipline: Discipline = 'cycling') =>
  useQuery({
    queryKey: recordKeys.scope(year, discipline),
    queryFn: () => trpc.records.get.query(year === undefined ? { discipline } : { year, discipline }),
    staleTime: Infinity, // Changes only on rebuild.
    placeholderData: (previous) => previous, // Keep the page while switching years.
  });
