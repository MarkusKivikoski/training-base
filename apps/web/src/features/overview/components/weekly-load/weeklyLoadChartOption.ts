import type { WeekTssRow } from '@app/metrics';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatShortDate, formatTss } from '@/shared/lib/formatters';

const tooltipText = (week: WeekTssRow) =>
  [
    `<b>Week of ${formatDate(week.weekStart)}</b>`,
    `TSS: <b>${formatTss(week.tss)}</b>`,
    week.usual === null ? 'Usual week: not enough history' : `Usual week (4 before): ${formatTss(week.usual)}`,
  ].join('<br/>');

/** Weekly TSS bars (series slot 4) with the usual week as a dashed muted line. */
export const buildWeeklyLoadChartOption = (weeks: readonly WeekTssRow[]) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');

  return {
    animationDuration: 300,
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
      textStyle: { color: ink, fontSize: 12 },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const week = weeks[params[0]?.dataIndex ?? 0];
        return week ? tooltipText(week) : '';
      },
    },
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((week) => formatShortDate(week.weekStart)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        name: 'Weekly TSS',
        type: 'bar',
        data: weeks.map((week) => ({ value: Math.round(week.tss), itemStyle: { borderRadius: [4, 4, 0, 0] } })),
        barMaxWidth: 24,
        itemStyle: { color: cssVar('--series-4') },
      },
      {
        name: 'Usual week (avg of 4 before)',
        type: 'line',
        data: weeks.map((week) => (week.usual === null ? null : Math.round(week.usual))),
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed', color: ink3 },
        itemStyle: { color: ink3 },
      },
    ],
  };
};
