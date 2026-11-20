import { useQuery } from '@tanstack/react-query';
import { trpc, type HeatmapInput } from './client';

export const heatmapKeys = {
  all: ['heatmap'] as const,
  routes: (input: HeatmapInput) => [...heatmapKeys.all, 'routes', input] as const,
};

/** Outdoor routes for the heatmap, plus the year and sport options. */
export const useHeatmap = (input: HeatmapInput) =>
  useQuery({
    queryKey: heatmapKeys.routes(input),
    queryFn: () => trpc.heatmap.routes.query(input),
    staleTime: Infinity, // Changes only on rebuild.
    placeholderData: (previous) => previous, // Keep the map while filters change.
  });
