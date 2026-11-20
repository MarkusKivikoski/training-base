import type { YearMetric } from '@app/metrics';
import type { Trends } from '@/shared/api/client';
import { cssVar } from '@/shared/charts/chartTheme';
import { YEAR_METRIC_INFO } from '../../lib/volumeMetrics';

type Year = Trends['years'][number];

/** Weeks on the axis: 53 covers any year. */
const WEEKS_IN_YEAR = 53;

/** Month label at the week containing the 1st of each month (non-leap calendar), else empty. */
const WEEK_LABELS = Array.from({ length: WEEKS_IN_YEAR }, (_, i) => {
  const weekStart = new Date(Date.UTC(2025, 0, 1 + i * 7));
  const weekEnd = new Date(Date.UTC(2025, 0, 7 + i * 7));
  const startsMonth = weekStart.getUTCMonth() !== weekEnd.getUTCMonth() || i === 0;
  return startsMonth ? weekEnd.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) : '';
});

type YearOverYearInput = {
  years: readonly Year[];
  currentYear: number;
  metric: YearMetric;
};

type TooltipParam = { dataIndex: number; seriesName: string; value: number | undefined };

/** Cumulative `metric` per week, one line per year; the current year bold in slot 1, earlier years muted. */
export const yearOverYearChartOption = ({ years, currentYear, metric }: YearOverYearInput) => {
  const info = YEAR_METRIC_INFO[metric];
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const currentColor = cssVar('--series-1');

  const tooltipFormatter = (params: TooltipParam[]) => {
    const week = (params[0]?.dataIndex ?? 0) + 1;
    const lines = params
      .filter((param) => param.value !== undefined)
      .sort((first, second) => Number(second.seriesName) - Number(first.seriesName))
      .map((param) => `${param.seriesName}: <b>${info.short(param.value!)}</b>`);
    return [`<b>Week ${week}</b> · ${info.title}`, ...lines].join('<br/>');
  };

  const yearSeries = (year: Year) => {
    const isCurrent = year.year === currentYear;
    const color = isCurrent ? currentColor : ink3;
    const data = year.weeks[metric];
    const total = data.at(-1) ?? 0;
    return {
      name: String(year.year),
      type: 'line',
      data,
      showSymbol: false,
      z: isCurrent ? 3 : 2,
      lineStyle: { width: isCurrent ? 3 : 1.5, color, opacity: isCurrent ? 1 : 0.7 },
      itemStyle: { color },
      endLabel: {
        show: true,
        color: isCurrent ? ink : ink2,
        fontSize: 11,
        fontWeight: isCurrent ? 'bold' : 'normal',
        formatter: () => `${year.year} · ${info.short(total)}`,
      },
      labelLayout: { moveOverlap: 'shiftY' },
      emphasis: { focus: 'series' },
    };
  };

  return {
    animationDuration: 300,
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    grid: { left: 8, right: 96, top: 12, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: WEEK_LABELS,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLabel: {
        color: ink3,
        fontSize: 11,
        formatter: (value: number) => (info.axisUnit ? `${value} ${info.axisUnit}` : String(value)),
      },
      splitLine: { lineStyle: { color: grid } },
    },
    series: years.map(yearSeries),
  };
};
