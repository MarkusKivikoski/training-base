import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/shared/api/client';
import { settingsKeys } from '@/shared/api/settings';
import type { ThresholdKind } from './lib/thresholdPrompt';

type DismissInput = { kind: ThresholdKind; activityId: string };

const dismissSuggestion = async ({ kind, activityId }: DismissInput): Promise<void> => {
  if (kind === 'ftp') await trpc.settingsEdit.dismissFtpSuggestion.mutate({ activityId });
  else await trpc.settingsEdit.dismissLthrSuggestion.mutate({ activityId });
};

/** Declines a suggested FTP or LTHR from a ride, so that ride isn't suggested again. */
export const useDismissThresholdSuggestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissSuggestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
};
