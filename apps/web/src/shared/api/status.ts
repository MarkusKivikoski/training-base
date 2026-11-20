import { useQuery } from '@tanstack/react-query';
import { trpc } from './client';

export const statusKeys = {
  all: ['status'] as const,
};

/** Index status and the server's "today" (local date). */
export const useStatus = () => useQuery({ queryKey: statusKeys.all, queryFn: () => trpc.status.query() });
