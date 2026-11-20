import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatShortDate } from '@/shared/lib/formatters';
import type { EffortChartPoint, EffortPanel } from '../../lib/effortChart';

const PANEL_HEIGHT = 84;
const PANEL_GAP = 36;
const CHART_TOP = 26;
const CHART_BOTTOM = 26;

/** The chart's height for a number of stacked panels, in pixels. */
export const pastEffortsChartHeightPx = (panelCount: number): number =>
  CHART_TOP + panelCount * PANEL_HEIGHT + (panelCount - 1) * PANEL_GAP + CHART_BOTTOM;

type SeriesPoint = { value: [string, number]; tooltip: string; symbolSize: number };

/**
 * Every effort on a workout or route by date, one stacked panel per measure sharing the date
 * axis. The ride being viewed is drawn larger. `points` are oldest first.
 */
export const pastEffortsChartOption = (panels: readonly EffortPanel[], points: readonly EffortChartPoint[]) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');

  // Day and month are enough within one year; efforts spread over several years need the year too.
  const years = new Set(points.map((point) => point.date.slice(0, 4)));
  const formatAxisDate = years.size > 1 ? formatDate : formatShortDate;

  const seriesPoints = (panelIndex: number): SeriesPoint[] => {
    const series: SeriesPoint[] = [];
    for (const point of points) {
      const value = point.values[panelIndex] ?? null;
      if (value === null) continue;
      series.push({ value: [point.date, value], tooltip: point.tooltip, symbolSize: point.isCurrent ? 13 : 8 });
    }
    return series;
  };

  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: (param: { data: SeriesPoint }) => param.data.tooltip,
    },
    grid: panels.map((_, index) => ({
      left: 52,
      right: 16,
      top: CHART_TOP + index * (PANEL_HEIGHT + PANEL_GAP),
      height: PANEL_HEIGHT,
    })),
    xAxis: panels.map((_, index) => ({
      type: 'time',
      gridIndex: index,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        show: index === panels.length - 1,
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        formatter: (ms: number) => formatAxisDate(new Date(ms).toISOString().slice(0, 10)),
      },
    })),
    yAxis: panels.map((panel, index) => ({
      type: 'value',
      gridIndex: index,
      scale: true,
      name: `${panel.title} (${panel.unit})`,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: ink2, fontSize: 12, align: 'left', padding: [0, 0, 0, -44] },
      splitNumber: 2,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    })),
    series: panels.map((panel, index) => {
      const color = cssVar(panel.slot);
      return {
        name: panel.title,
        type: 'line',
        xAxisIndex: index,
        yAxisIndex: index,
        data: seriesPoints(index),
        symbol: 'circle',
        lineStyle: { width: 1.5, color },
        itemStyle: { color, borderColor: surface, borderWidth: 2 },
      };
    }),
  };
};
