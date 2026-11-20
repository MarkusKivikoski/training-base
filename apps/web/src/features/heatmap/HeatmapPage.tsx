import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useStatus } from '@/shared/api/status';
import { useHeatmap } from '@/shared/api/heatmap';
import { toLocalIsoDate } from '@/shared/lib/dates';
import { HeatmapView } from './components/HeatmapView';
import { heatmapSearch, toHeatmapInput, type HeatmapFilters } from './search';

const route = getRouteApi('/heatmap');

/** Full-bleed map: cancels the layout's padding and fills the viewport (below the 87 px mobile header). */
export const HeatmapPage = () => {
  const search = route.useSearch();
  const navigate = useNavigate({ from: '/heatmap' });
  const today = useStatus().data?.today ?? toLocalIsoDate(new Date());
  const heatmap = useHeatmap(toHeatmapInput(search));

  const changeFilters = (filters: HeatmapFilters) => void navigate({ search: heatmapSearch(filters), replace: true });
  const openRide = (activityId: string) => void navigate({ to: '/activities/$activityId', params: { activityId } });

  return (
    <div className="relative -m-4 h-[calc(100dvh-87px)] sm:-m-6 md:h-dvh lg:-m-8">
      <HeatmapView
        data={heatmap.data}
        error={heatmap.error}
        search={search}
        today={today}
        onFiltersChange={changeFilters}
        onOpenRide={openRide}
      />
    </div>
  );
};
