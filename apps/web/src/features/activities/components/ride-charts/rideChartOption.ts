import type { TimeRange } from '@app/metrics';
import type { ActivityStreams } from '@/shared/api/client';
import { cssVar } from '@/shared/charts/chartTheme';
import { EMPTY, formatClock } from '@/shared/lib/formatters';
import { indexAtTime, toChartPoints } from '../../lib/streamPoints';
import { CHART_TOP, PANEL_GAP, PANEL_HEIGHT, type RidePanel } from './ridePanels';

type RideChartInput = {
  stream: ActivityStreams;
  panels: readonly RidePanel[];
  intervals: readonly TimeRange[];
  climbs: readonly TimeRange[];
  recordingGaps: readonly TimeRange[];
};

const tooltipFormatter =
  (stream: ActivityStreams, panels: readonly RidePanel[]) => (params: Array<{ axisValue: number }>) => {
    const t = Number(params[0]?.axisValue ?? 0);
    const i = indexAtTime(stream.time, t);
    const lines = panels.map((panel) => {
      const value = stream[panel.key]?.[i];
      const shown =
        value === null || value === undefined
          ? EMPTY
          : `${(value * (panel.scale ?? 1)).toFixed(panel.digits)} ${panel.unit}`;
      return `${panel.title}: <b>${shown}</b>`;
    });
    return [`<b>${formatClock(stream.time[i] ?? t)}</b>`, ...lines].join('<br/>');
  };

const NO_LABEL = { show: false };

/** Climbs shaded on the elevation panel, in the order of the climbs table. */
const climbAreas = (color: string, climbs: readonly TimeRange[]) =>
  climbs.map((range) => [
    { xAxis: range.startS, itemStyle: { color, opacity: 0.18 }, label: NO_LABEL },
    { xAxis: range.endS },
  ]);

/** Work intervals shaded on the power panel, numbered like the intervals table. */
const intervalAreas = (color: string, labelColor: string, intervals: readonly TimeRange[]) =>
  intervals.map((range, k) => [
    {
      xAxis: range.startS,
      name: String(k + 1),
      itemStyle: { color, opacity: 0.12 },
      label: { show: true, position: 'insideTop', color: labelColor, fontSize: 10 },
    },
    { xAxis: range.endS },
  ]);

/** Time not recorded between the recordings of a merged ride, on every panel; labelled on the top one. */
const recordingGapAreas = (color: string, labelColor: string, gaps: readonly TimeRange[], isTopPanel: boolean) =>
  gaps.map((range) => [
    {
      xAxis: range.startS,
      name: 'Not recorded',
      itemStyle: { color, opacity: 0.12 },
      label: isTopPanel ? { show: true, position: 'insideTop', color: labelColor, fontSize: 10 } : NO_LABEL,
    },
    { xAxis: range.endS },
  ]);

const panelSeries = (
  panel: RidePanel,
  i: number,
  { stream, intervals, climbs, recordingGaps }: RideChartInput,
  ink2: string,
  ink3: string,
) => {
  const color = cssVar(panel.slot);
  const isElevation = panel.key === 'altitude';
  const isPower = panel.key === 'power';
  const areas = [
    ...(isElevation ? climbAreas(color, climbs) : []),
    ...(isPower ? intervalAreas(color, ink2, intervals) : []),
    ...recordingGapAreas(ink3, ink2, recordingGaps, i === 0),
  ];

  return {
    name: panel.title,
    type: 'line',
    xAxisIndex: i,
    yAxisIndex: i,
    data: toChartPoints(stream.time, stream[panel.key]!, panel.scale),
    showSymbol: false,
    connectNulls: false,
    sampling: 'lttb',
    lineStyle: { width: 1.5, color },
    itemStyle: { color },
    ...(isElevation ? { areaStyle: { color, opacity: 0.15 } } : {}),
    ...(areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
  };
};

/** The stacked ride charts: one grid per panel, a shared crosshair and tooltip, and one zoom slider. */
export const rideChartOption = (input: RideChartInput) => {
  const { panels } = input;
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const panelIndices = panels.map((_, i) => i);

  return {
    animation: false,
    axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: ink3 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: cssVar('--text-primary'), fontSize: 12 },
      formatter: tooltipFormatter(input.stream, panels),
    },
    grid: panels.map((_, i) => ({
      left: 48,
      right: 16,
      top: CHART_TOP + i * (PANEL_HEIGHT + PANEL_GAP),
      height: PANEL_HEIGHT,
    })),
    xAxis: panels.map((_, i) => ({
      type: 'value',
      gridIndex: i,
      min: 'dataMin',
      max: 'dataMax',
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        show: i === panels.length - 1,
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        showMinLabel: false,
        showMaxLabel: false,
        formatter: (seconds: number) => formatClock(seconds),
      },
    })),
    yAxis: panels.map((panel, i) => ({
      type: 'value',
      gridIndex: i,
      name: `${panel.title} (${panel.unit})`,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: ink2, fontSize: 12, align: 'left', padding: [0, 0, 0, -40] },
      splitNumber: 2,
      scale: panel.key === 'altitude' || panel.key === 'hr',
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    })),
    dataZoom: [
      // Slider only: ECharts' "inside" zoom cancels wheel events even with wheel zoom off,
      // which would stop the page from scrolling over the charts.
      {
        type: 'slider',
        xAxisIndex: panelIndices,
        bottom: 8,
        height: 22,
        // Room for the start/end time labels beside the handles.
        left: 56,
        right: 56,
        borderColor: grid,
        textStyle: { color: ink3 },
        labelFormatter: (seconds: number) => formatClock(seconds),
      },
    ],
    series: panels.map((panel, i) => panelSeries(panel, i, input, ink2, ink3)),
  };
};
