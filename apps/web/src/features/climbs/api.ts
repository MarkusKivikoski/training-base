import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/shared/api/client';
import { climbKeys } from '@/shared/api/climbs';

export const useClimb = (id: string) =>
  useQuery({
    queryKey: climbKeys.detail(id),
    queryFn: () => trpc.climbs.get.query({ id }),
    staleTime: Infinity,
  });

/** Names a climb; every climb query refetches so the new name shows everywhere. */
export const useRenameClimb = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => trpc.climbs.rename.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: climbKeys.all }),
  });
};
