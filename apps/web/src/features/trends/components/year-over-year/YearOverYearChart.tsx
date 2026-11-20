import type { YearMetric } from '@app/metrics';
import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { formatShortDate } from '@/shared/lib/formatters';
import { YEAR_METRIC_INFO } from '../../lib/volumeMetrics';
import { yearOverYearChartOption } from './yearOverYearChartOption';
import { YearToDateTable } from './YearToDateTable';

type YearOverYearChartProps = {
  years: readonly Trends['years'][number][];
  today: string;
  metric: YearMetric;
};

/**
 * Cumulative `metric` (a riding measure or gym workouts) through the year, one line per year. The
 * current year is series slot 1 and bold; earlier years are muted. Every line has a direct end
 * label (year and total), so identity never depends on colour. The table beside it compares
 * totals by today's date.
 */
export const YearOverYearChart = ({ years, today, metric }: YearOverYearChartProps) => {
  const colorScheme = useColorScheme();
  const info = YEAR_METRIC_INFO[metric];
  const currentYear = Number(today.slice(0, 4));
  const todayLabel = formatShortDate(today);

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => yearOverYearChartOption({ years, currentYear, metric }),
    [years, currentYear, metric, colorScheme],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
      <EChart
        option={option}
        className="h-80"
        ariaLabel={`Cumulative ${info.title.toLowerCase()} through the year, one line per year from ${years[0]?.year} to ${currentYear}. The table lists totals by ${todayLabel} for each year.`}
      />
      <div>
        <p className="mb-2 text-xs text-ink-2">
          {info.title} by {todayLabel}
        </p>
        <YearToDateTable years={years} currentYear={currentYear} metric={metric} />
      </div>
    </div>
  );
};
