import { getRouteApi } from '@tanstack/react-router';
import { useTrends } from '@/shared/api/trends';
import { Vo2maxCard } from '@/shared/charts/markers/Vo2maxCard';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { DecouplingCard } from './components/markers/DecouplingCard';
import { EfCard } from './components/markers/EfCard';
import { FtpCard } from './components/markers/FtpCard';
import { MaxHrCard } from './components/markers/MaxHrCard';
import { WeightCard } from './components/markers/WeightCard';
import { VolumeCard } from './components/volume/VolumeCard';
import { YearOverYearCard } from './components/year-over-year/YearOverYearCard';
import { ZoneTrendCard } from './components/zones/ZoneTrendCard';
import type { VolumeMetric } from './lib/volumeMetrics';
import { parseMetrics, trendsSearch } from './search';

const route = getRouteApi('/trends');

/** Volume, year over year, time in zones and fitness markers over time. */
export const TrendsPage = () => {
  const trends = useTrends();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  // The selected volume measures live in the URL and drive both volume cards.
  const metrics = parseMetrics(search.metrics);
  const showsGym = search.gym === 1;

  const setMetrics = (next: VolumeMetric[]) => void navigate({ search: trendsSearch(next, showsGym), replace: true });
  const setShowsGym = (next: boolean) => void navigate({ search: trendsSearch(metrics, next), replace: true });
  const openMonth = (month: string) => void navigate({ to: '/calendar', search: { month } });

  if (trends.isPending) return <Loading />;
  if (trends.error) return <ErrorMessage error={trends.error} />;

  if (trends.data.months.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Trends</h1>
        <p className="text-sm text-ink-3">
          No data yet. Run <code>npm run sync</code>, then <code>npm run rebuild</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Trends</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <VolumeCard
          months={trends.data.months}
          metrics={metrics}
          onMetricsChange={setMetrics}
          onMonthOpen={openMonth}
        />
        <YearOverYearCard trends={trends.data} metrics={metrics} showsGym={showsGym} onShowsGymChange={setShowsGym} />
        <ZoneTrendCard zones={trends.data.zones} />
        <FtpCard trends={trends.data} />
        <Vo2maxCard points={trends.data.vo2max} today={trends.data.today} />
        <EfCard trends={trends.data} />
        <DecouplingCard trends={trends.data} />
        <MaxHrCard trends={trends.data} />
        <WeightCard today={trends.data.today} />
      </div>
    </div>
  );
};
