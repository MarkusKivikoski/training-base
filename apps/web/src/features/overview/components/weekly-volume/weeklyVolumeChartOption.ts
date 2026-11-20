import type { WeekVolume } from '@app/metrics';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatDistance, formatHours, formatShortDate } from '@/shared/lib/formatters';

const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

/** A bar segment; only the top of each stack (the visible data end) is rounded. */
const segment = (value: number, isTop: boolean) => ({ value, itemStyle: { borderRadius: isTop ? [4, 4, 0, 0] : 0 } });

const tooltipText = (week: WeekVolume) => {
  const totalS = week.indoorDurationS + week.outdoorDurationS;
  return [
    `<b>Week of ${formatDate(week.weekStart)}</b>`,
    `Total: ${formatHours(totalS)} · ${week.count} ${week.count === 1 ? 'ride' : 'rides'}`,
    `Indoor: ${formatHours(week.indoorDurationS)}`,
    `Outdoor: ${formatHours(week.outdoorDurationS)}`,
    `Outdoor distance: ${formatDistance(week.distanceM, 0)}`,
  ].join('<br/>');
};

/** Weekly riding hours, stacked indoor (series 1) and outdoor (series 2), on one hours axis. */
export const buildWeeklyVolumeChartOption = (weeks: readonly WeekVolume[]) => {
  const surface = cssVar('--surface-1');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');

  const indoor = weeks.map((week) => segment(toHours(week.indoorDurationS), week.outdoorDurationS === 0));
  const outdoor = weeks.map((week) => segment(toHours(week.outdoorDurationS), true));

  const stackedSeries = (name: string, color: string, data: typeof indoor) => ({
    name,
    type: 'bar',
    stack: 'hours',
    data,
    barMaxWidth: 28,
    // A 1px surface-coloured border on each segment gives the 2px gap between stacked fills.
    itemStyle: { color, borderColor: surface, borderWidth: 1 },
    emphasis: { focus: 'series' },
  });

  return {
    animationDuration: 300,
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: ink2, fontSize: 12 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: grid, opacity: 0.5 } },
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: cssVar('--text-primary'), fontSize: 12 },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const week = weeks[params[0]?.dataIndex ?? 0];
        return week ? tooltipText(week) : '';
      },
    },
    xAxis: {
      type: 'category',
      data: weeks.map((week) => formatShortDate(week.weekStart)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      stackedSeries('Indoor', cssVar('--series-1'), indoor),
      stackedSeries('Outdoor', cssVar('--series-2'), outdoor),
    ],
  };
};
