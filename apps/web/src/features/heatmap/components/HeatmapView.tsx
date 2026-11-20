import { lazy, Suspense } from 'react';
import type { HeatmapRoutes } from '@/shared/api/client';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import type { HeatmapFilters, HeatmapSearch } from '../search';
import { HeatmapPanel } from './HeatmapPanel';

// MapLibre and deck.gl load only when this page opens.
const HeatmapMap = lazy(() => import('@/shared/map/HeatmapMap').then((module) => ({ default: module.HeatmapMap })));

type HeatmapViewProps = {
  data: HeatmapRoutes | undefined;
  error: Error | null;
  search: HeatmapSearch;
  today: string;
  onFiltersChange: (filters: HeatmapFilters) => void;
  onOpenRide: (activityId: string) => void;
};

/** The map with its filter panel, or the error, loading and no-routes states. */
export const HeatmapView = ({ data, error, search, today, onFiltersChange, onOpenRide }: HeatmapViewProps) => {
  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage error={error} />
      </div>
    );
  }
  if (!data) return <Loading />;
  // Without a sport choice there is nothing to show at all; with one, the panel stays so it can be changed back.
  const hasNoRoutesAtAll = data.years.length === 0 && !search.show;
  if (hasNoRoutesAtAll) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Heatmap</h1>
        <p className="text-sm text-ink-3">
          No outdoor rides with GPS yet. Sync some, then run <code>npm run rebuild</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<Loading label="Loading map…" />}>
        <HeatmapMap routes={data.routes} mode={search.mode ?? 'heatmap'} onOpen={onOpenRide} />
      </Suspense>
      <HeatmapPanel data={data} search={search} today={today} onChange={onFiltersChange} />
    </>
  );
};
