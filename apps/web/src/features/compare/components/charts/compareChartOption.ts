import type { ActivityStreams } from '@/shared/api/client';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatClock } from '@/shared/lib/formatters';
import { COMPARE_SLOTS } from '../../constants';
import { alignedPoints } from '../../lib/alignedPoints';
import { CHART_TOP, PANEL_GAP, PANEL_HEIGHT, type ComparePanel } from './comparePanels';

type CompareChartInput = {
  a: ActivityStreams;
  b: ActivityStreams;
  /** Legend names of ride A and ride B. */
  labels: readonly [string, string];
  panels: readonly ComparePanel[];
  byDistance: boolean;
};

type TooltipParam = { seriesName: string; value: [number, number]; seriesIndex: number };

/** Two rides overlaid, one grid per channel, sharing the x-axis (km or elapsed time). */
export const compareChartOption = ({ a, b, labels, panels, byDistance }: CompareChartInput) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const colors = [cssVar(COMPARE_SLOTS.a), cssVar(COMPARE_SLOTS.b)];
  const formatX = (x: number) => (byDistance ? `${x.toFixed(1)} km` : formatClock(x));

  const tooltipFormatter = (params: TooltipParam[]) => {
    const x = params[0]?.value[0];
    if (x === undefined) return '';
    const lines = params.map((param) => {
      // Two series per panel: A, then B.
      const panel = panels[Math.floor(param.seriesIndex / 2)]!;
      const ride = param.seriesName === labels[0] ? 'A' : 'B';
      return `${ride} ${panel.title}: <b>${param.value[1].toFixed(panel.digits)} ${panel.unit}</b>`;
    });
    return [`<b>${formatX(x)}</b>`, ...lines].join('<br/>');
  };

  return {
    animation: false,
    legend: {
      top: 0,
      left: 0,
      data: labels,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: ink2, fontSize: 12 },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: ink3 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    grid: panels.map((_, i) => ({
      left: 52,
      right: 16,
      top: CHART_TOP + i * (PANEL_HEIGHT + PANEL_GAP),
      height: PANEL_HEIGHT,
    })),
    xAxis: panels.map((_, i) => ({
      type: 'value',
      gridIndex: i,
      min: 0,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: i === panels.length - 1, color: ink3, fontSize: 11, hideOverlap: true, formatter: formatX },
    })),
    yAxis: panels.map((panel, i) => ({
      type: 'value',
      gridIndex: i,
      name: `${panel.title} (${panel.unit})`,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: ink2, fontSize: 12, align: 'left', padding: [0, 0, 0, -44] },
      splitNumber: 2,
      scale: panel.key === 'altitude' || panel.key === 'hr',
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    })),
    series: panels.flatMap((panel, i) =>
      [a, b].map((stream, k) => ({
        name: labels[k],
        type: 'line',
        xAxisIndex: i,
        yAxisIndex: i,
        data: alignedPoints(stream, panel.key, byDistance, panel.scale),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.5, color: colors[k] },
        itemStyle: { color: colors[k] },
      })),
    ),
  };
};
