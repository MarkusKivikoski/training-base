import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { trpc } from './client';

export const syncKeys = {
  all: ['sync'] as const,
  status: () => [...syncKeys.all, 'status'] as const,
};

const POLL_WHILE_RUNNING_MS = 1500;
const POLL_WHEN_IDLE_MS = 60_000;

/**
 * Status of the background job (a sync, or recomputing after a settings change). Polls every
 * 1.5 s while it runs, otherwise once a minute so "last synced" stays fresh. When a run
 * finishes, every other query is refetched, so all pages show the new data.
 */
export const useSyncStatus = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: syncKeys.status(),
    queryFn: () => trpc.sync.status.query(),
    refetchInterval: (q) => (q.state.data?.state === 'running' ? POLL_WHILE_RUNNING_MS : POLL_WHEN_IDLE_MS),
    staleTime: 0,
  });

  const lastState = useRef(query.data?.state);
  useEffect(() => {
    const state = query.data?.state;
    const justFinished = lastState.current === 'running' && state === 'succeeded';
    if (justFinished) {
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== syncKeys.all[0] });
    }
    lastState.current = state;
  }, [query.data?.state, queryClient]);

  return query;
};

/** Starts a sync; the status query then follows its progress. */
export const useStartSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => trpc.sync.start.mutate(),
    onSuccess: (status) => queryClient.setQueryData(syncKeys.status(), status),
  });
};
