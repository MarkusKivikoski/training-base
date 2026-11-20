import { useQuery } from '@tanstack/react-query';
import { trpc } from './client';

type DateRange = { from?: string; to?: string };

export const loadKeys = {
  all: ['load'] as const,
  daily: (range: DateRange) => [...loadKeys.all, 'daily', range] as const,
};

/** Daily TSS/CTL/ATL/TSB (cycling) and the all-activities series. */
export const useDailyLoad = (range: DateRange = {}) =>
  useQuery({ queryKey: loadKeys.daily(range), queryFn: () => trpc.load.daily.query(range) });
