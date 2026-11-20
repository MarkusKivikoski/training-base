import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc, type Goal } from '@/shared/api/client';

export const goalKeys = {
  all: ['goals'] as const,
};

/** The user's riding goals (settings/goals.json). */
export const useGoals = () => useQuery({ queryKey: goalKeys.all, queryFn: () => trpc.goals.list.query() });

/** Replaces all goals. */
export const useSaveGoals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goals: Goal[]) => trpc.goals.save.mutate({ goals }),
    onSuccess: (goals) => queryClient.setQueryData(goalKeys.all, goals),
  });
};
