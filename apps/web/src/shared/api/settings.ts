import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc, type SyncJobStatus } from './client';
import { syncKeys } from './sync';

export const settingsKeys = {
  all: ['settings'] as const,
  current: () => [...settingsKeys.all, 'current'] as const,
};

export type SaveSettingInput = Parameters<typeof trpc.settingsEdit.save.mutate>[0];

/** FTP, LTHR and weight in effect today, their histories, the heatmap privacy trim and declined FTP rides. */
export const useSettings = () =>
  useQuery({ queryKey: settingsKeys.current(), queryFn: () => trpc.settings.current.query() });

/**
 * A settings write. Each returns the background job that recomputes derived data; putting it in
 * the sync-status cache starts that query's polling, and every page refreshes when it finishes.
 */
export const useSettingsMutation = <Input>(write: (input: Input) => Promise<SyncJobStatus>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (job) => {
      queryClient.setQueryData(syncKeys.status(), (old: object | undefined) => ({ ...old, ...job }));
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
};

/** Adds an FTP, LTHR or weight entry, or replaces the one with the same start date. */
export const useSaveSetting = () =>
  useSettingsMutation((input: SaveSettingInput) => trpc.settingsEdit.save.mutate(input));
