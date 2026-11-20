import type { Trends } from '@/shared/api/client';
import { formatMonth } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { comparedYears, partialFirstYear } from '../../lib/comparedYears';
import { YEAR_METRIC_INFO, type VolumeMetric, type YearMetric } from '../../lib/volumeMetrics';
import { YearOverYearChart } from './YearOverYearChart';

type YearOverYearCardProps = {
  trends: Trends;
  /** The riding measures selected in Riding volume. */
  metrics: readonly VolumeMetric[];
  showsGym: boolean;
  onShowsGymChange: (showsGym: boolean) => void;
};

/** One year-over-year chart per selected measure, plus gym workouts when ticked. */
export const YearOverYearCard = ({ trends, metrics, showsGym, onShowsGymChange }: YearOverYearCardProps) => {
  const yearMetrics: YearMetric[] = showsGym ? [...metrics, 'gym'] : [...metrics];
  const partialYear = partialFirstYear(trends.months);
  const years = comparedYears(trends.years, partialYear);
  const firstMonth = trends.months[0]?.month;
  const hasSeveralCharts = yearMetrics.length > 1;

  return (
    <Card
      title="Year over year"
      className="lg:col-span-3"
      action={
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input
            type="checkbox"
            checked={showsGym}
            onChange={(event) => onShowsGymChange(event.target.checked)}
            className="size-4 accent-[var(--series-1)]"
          />
          Gym workouts
        </label>
      }
    >
      <div className="space-y-6">
        {yearMetrics.map((metric) => (
          <section key={metric} aria-label={`Year over year: ${YEAR_METRIC_INFO[metric].title}`}>
            {hasSeveralCharts && (
              <h3 className="mb-2 text-xs font-semibold text-ink-2">{YEAR_METRIC_INFO[metric].title}</h3>
            )}
            <YearOverYearChart years={years} today={trends.today} metric={metric} />
          </section>
        ))}
      </div>
      {partialYear !== null && firstMonth && (
        <p className="mt-2 text-xs text-ink-3">
          {partialYear} is left out: your synced data starts in {formatMonth(firstMonth)}.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-3">
        Riding measures follow the selection in Riding volume above.
        {showsGym
          ? ' Gym workouts count strength training sessions.'
          : ' Tick Gym workouts to compare strength sessions too.'}
      </p>
    </Card>
  );
};
