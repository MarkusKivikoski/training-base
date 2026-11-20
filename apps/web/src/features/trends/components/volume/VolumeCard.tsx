import { useMemo, useState } from 'react';
import type { Trends } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { Card } from '@/shared/ui/Card';
import { Toggle } from '@/shared/ui/Toggle';
import { volumeBuckets, type Granularity } from '../../lib/volumeBuckets';
import { VOLUME_METRIC_INFO, VOLUME_METRIC_ORDER, type VolumeMetric } from '../../lib/volumeMetrics';
import { MultiToggle } from '../MultiToggle';
import { VOLUME_CHART_HEIGHT, volumeChartOption } from './volumeChartOption';
import { VolumeTable } from './VolumeTable';

type View = 'chart' | 'table';

const METRIC_OPTIONS = VOLUME_METRIC_ORDER.map((metric) => ({
  value: metric,
  label: VOLUME_METRIC_INFO[metric].label,
}));

const GRANULARITY_OPTIONS: ReadonlyArray<{ value: Granularity; label: string }> = [
  { value: 'month', label: 'Months' },
  { value: 'year', label: 'Years' },
];

const VIEW_OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

type VolumeCardProps = {
  months: Trends['months'];
  metrics: readonly VolumeMetric[];
  onMetricsChange: (metrics: VolumeMetric[]) => void;
  /** Opens a month (`YYYY-MM`) in the calendar. */
  onMonthOpen: (month: string) => void;
};

/**
 * Riding volume over the years. The selected measures are grouped bars in one chart; their
 * units differ (h, km, m, rides), so each measure gets its own y-axis, labelled with its unit
 * and drawn in its bar colour (left, right, then outer left/right). Gridlines follow the first
 * axis and the others align to it. Strength sessions are a separate strip below in neutral grey.
 */
export const VolumeCard = ({ months, metrics, onMetricsChange, onMonthOpen }: VolumeCardProps) => {
  const colorScheme = useColorScheme();
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [view, setView] = useState<View>('chart');
  const buckets = useMemo(() => volumeBuckets(months, granularity), [months, granularity]);

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => volumeChartOption({ buckets, metrics, granularity }),
    [buckets, metrics, granularity, colorScheme],
  );

  const selectedTitles = metrics.map((metric) => VOLUME_METRIC_INFO[metric].title.toLowerCase()).join(', ');

  const isMonthly = granularity === 'month';
  // Bucket keys are `YYYY-MM` in the monthly view.
  const openBucket = (index: number) => {
    const bucket = buckets[index];
    if (bucket) onMonthOpen(bucket.key);
  };

  return (
    <Card title="Riding volume" className="lg:col-span-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MultiToggle
          label="Volume metrics (select one or more)"
          values={metrics}
          onChange={onMetricsChange}
          options={METRIC_OPTIONS}
        />
        <Toggle label="Group by" value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
        <span className="ml-auto">
          <Toggle label="Volume view" value={view} onChange={setView} options={VIEW_OPTIONS} />
        </span>
      </div>
      <p className="mb-1 text-xs text-ink-3">
        Per {granularity} · select one or more measures · year over year below follows your selection
        {isMonthly && ' · click a month to open it in the calendar'}
      </p>
      {view === 'chart' ? (
        <EChart
          option={option}
          className=""
          style={{ height: VOLUME_CHART_HEIGHT }}
          ariaLabel={`Riding ${selectedTitles} per ${granularity}, as grouped bars, each measure on its own axis, with strength sessions per ${granularity} below. Switch to the table view for values.`}
          onCategoryClick={isMonthly ? openBucket : undefined}
        />
      ) : (
        <VolumeTable buckets={buckets} granularity={granularity} onMonthOpen={onMonthOpen} />
      )}
    </Card>
  );
};
