import { trpc } from '@/shared/api/client';
import { useSettingsMutation } from '@/shared/api/settings';

type RemoveSettingInput = Parameters<typeof trpc.settingsEdit.remove.mutate>[0];

export const useRemoveSetting = () =>
  useSettingsMutation((input: RemoveSettingInput) => trpc.settingsEdit.remove.mutate(input));

export const useSetPrivacyTrim = () =>
  useSettingsMutation((metres: number) => trpc.settingsEdit.privacyTrim.mutate({ metres }));
