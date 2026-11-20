import { Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { useHeatmap } from '@/shared/api/heatmap';
import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';

// MapLibre and deck.gl load only when the map is shown.
const HeatmapMap = lazy(() => import('@/shared/map/HeatmapMap').then((module) => ({ default: module.HeatmapMap })));

type YearMapProps = {
  year: number;
  discipline: Discipline;
};

/** The year's outdoor ride (or run) routes as a heatmap, with a link to the full Heatmap page. */
export const YearMap = ({ year, discipline }: YearMapProps) => {
  const heatmap = useHeatmap({ year, discipline });
  const { many } = DISCIPLINE_WORDS[discipline];
  const heatmapSearch = discipline === 'running' ? { year, show: 'running' as const } : { year };
  const navigate = useNavigate();
  const routes = heatmap.data?.routes ?? [];

  if (heatmap.isPending) return <Loading label="Loading map…" />;
  if (heatmap.error) return <ErrorMessage error={heatmap.error} />;
  if (routes.length === 0)
    return (
      <p className="text-sm text-ink-3">
        No outdoor {many} with GPS in {year}.
      </p>
    );

  const openRide = (activityId: string) => void navigate({ to: '/activities/$activityId', params: { activityId } });

  return (
    <>
      <div className="relative h-80 overflow-hidden rounded-lg">
        <Suspense fallback={<Loading label="Loading map…" />}>
          <HeatmapMap routes={routes} mode="heatmap" onOpen={openRide} />
        </Suspense>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {routes.length} outdoor {routes.length === 1 ? 'route' : 'routes'}.{' '}
        <Link to="/heatmap" search={heatmapSearch} className="underline hover:text-ink">
          Open the heatmap
        </Link>
      </p>
    </>
  );
};
