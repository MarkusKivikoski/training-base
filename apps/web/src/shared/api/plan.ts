import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc, type Plan, type PlannedEvent, type PlannedSession, type PlanPresets } from './client';

export const planKeys = {
  all: ['plan'] as const,
  get: () => [...planKeys.all, 'get'] as const,
};

/** Planned sessions and the TSS of the Easy, Medium and Hard presets. */
export const usePlan = () => useQuery({ queryKey: planKeys.get(), queryFn: () => trpc.plan.get.query() });

/** A plan change: the API returns the whole plan, which replaces the cached one. */
const usePlanMutation = <Input>(write: (input: Input) => Promise<Plan>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (plan) => queryClient.setQueryData(planKeys.get(), plan),
  });
};

/** Adds a planned session, or replaces the one with the same id. */
export const useSavePlannedSession = () =>
  usePlanMutation((session: PlannedSession) => trpc.plan.saveSession.mutate(session));

export const useRemovePlannedSession = () => usePlanMutation((id: string) => trpc.plan.removeSession.mutate({ id }));

/** Adds a target event, or replaces the one with the same id. */
export const useSavePlannedEvent = () => usePlanMutation((event: PlannedEvent) => trpc.plan.saveEvent.mutate(event));

export const useRemovePlannedEvent = () => usePlanMutation((id: string) => trpc.plan.removeEvent.mutate({ id }));

export const useSetPlanPresets = () => usePlanMutation((presets: PlanPresets) => trpc.plan.setPresets.mutate(presets));
