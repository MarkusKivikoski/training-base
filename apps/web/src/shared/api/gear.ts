import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc, type Bike, type Gear, type GearComponent, type Tyre } from './client';

export const gearKeys = {
  all: ['gear'] as const,
  get: () => [...gearKeys.all, 'get'] as const,
};

/** Bikes, their components, per-ride bike overrides, tyres and per-ride tyre tags. */
export const useGear = () => useQuery({ queryKey: gearKeys.get(), queryFn: () => trpc.gear.get.query() });

/** A gear change: the API returns the whole gear file, which replaces the cached one. */
const useGearMutation = <Input>(write: (input: Input) => Promise<Gear>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: write, onSuccess: (gear) => queryClient.setQueryData(gearKeys.get(), gear) });
};

export const useSaveBike = () => useGearMutation((bike: Bike) => trpc.gear.saveBike.mutate(bike));

export const useRemoveBike = () => useGearMutation((id: string) => trpc.gear.removeBike.mutate({ id }));

export const useSaveComponent = () =>
  useGearMutation((component: GearComponent) => trpc.gear.saveComponent.mutate(component));

export const useRemoveComponent = () => useGearMutation((id: string) => trpc.gear.removeComponent.mutate({ id }));

/** Sets one ride's bike ("none" for no bike), or null to let its ride type decide. */
export const useSetRideBike = () =>
  useGearMutation((input: { activityId: string; bikeId: string | null }) => trpc.gear.setRideBike.mutate(input));

/** Adds a set of tyres, or renames the one with the same id. */
export const useSaveTyre = () => useGearMutation((tyre: Tyre) => trpc.tyres.save.mutate(tyre));

/** Removes a set of tyres and its tag from every ride. */
export const useRemoveTyre = () => useGearMutation((id: string) => trpc.tyres.remove.mutate({ id }));

/** Tags one ride with the tyres it was on, or null to clear the tag. */
export const useSetRideTyre = () =>
  useGearMutation((input: { activityId: string; tyreId: string | null }) => trpc.tyres.setForRide.mutate(input));
