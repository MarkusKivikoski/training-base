import { useQuery } from '@tanstack/react-query';
import { trpc } from './client';

export const climbKeys = {
  all: ['climbs'] as const,
  list: () => [...climbKeys.all, 'list'] as const,
  detail: (id: string) => [...climbKeys.all, 'get', id] as const,
  forActivity: (id: string) => [...climbKeys.all, 'activity', id] as const,
};

/** Every climb found in outdoor rides. */
export const useClimbs = () =>
  useQuery({ queryKey: climbKeys.list(), queryFn: () => trpc.climbs.list.query(), staleTime: Infinity });
