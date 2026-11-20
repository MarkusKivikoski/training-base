import { toLocalIsoDate } from '@/shared/lib/dates';
import { formatDate, formatShortDate } from '@/shared/lib/formatters';
import { cssVar } from '../chartTheme';

export type MarkerPoint = {
  date: string;
  value: number;
  /** Shown in the tooltip, e.g. the ride name. */
  label?: string | undefined;
};

export type MarkerSeries = {
  name: string;
  /** CSS variable of the series colour, e.g. "--series-1". */
  slot: string;
  kind: 'points' | 'step' | 'line';
  dashed?: boolean;
  points: MarkerPoint[];
};

type MarkerChartInput = {
  series: readonly MarkerSeries[];
  format: (value: number) => string;
  /** Step lines and the axis run to this date. */
  throughDate: string;
};

type DataPoint = { value: [number, number]; label: string | undefined };

const DAY_MS = 86_400_000;
/** Spans longer than this label months and years instead of days. */
const LONG_SPAN_MS = 300 * DAY_MS;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

/**
 * Ticks fall on local midnights, so they're read in local time (UTC would show 1 Jan as 31.12.).
 * Long spans label years (January) and month.year; short spans day.month.
 */
const axisDateLabel = (ms: number, isLongSpan: boolean) => {
  const date = new Date(ms);
  if (!isLongSpan) return formatShortDate(toLocalIsoDate(date));
  if (date.getMonth() === 0) return String(date.getFullYear());
  return `${date.getMonth() + 1}.${date.getFullYear()}`;
};

const seriesOption = (series: MarkerSeries, endMs: number, surface: string) => {
  const color = cssVar(series.slot);
  const data: DataPoint[] = series.points.map((point) => ({
    value: [toMs(point.date), point.value],
    label: point.label,
  }));

  if (series.kind === 'points') {
    return {
      name: series.name,
      type: 'scatter',
      data,
      symbolSize: 9,
      itemStyle: { color, borderColor: surface, borderWidth: 1 },
    };
  }

  // Settings stay in effect until today, so the step line runs to the right edge.
  const lastPoint = data.at(-1);
  if (series.kind === 'step' && lastPoint) data.push({ value: [endMs, lastPoint.value[1]], label: undefined });

  return {
    name: series.name,
    type: 'line',
    data,
    step: series.kind === 'step' ? 'end' : undefined,
    showSymbol: series.kind !== 'step',
    symbolSize: 5,
    lineStyle: { width: 2, color, type: series.dashed ? 'dashed' : 'solid' },
    itemStyle: { color },
  };
};

/** A fitness marker on a date axis, padded a little on both sides. */
export const markerChartOption = ({ series, format, throughDate }: MarkerChartInput) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');

  const pointTimes = series.flatMap((one) => one.points.map((point) => toMs(point.date)));
  const endMs = toMs(throughDate);
  const startMs = Math.min(...pointTimes, endMs);
  const padMs = Math.max(2 * DAY_MS, (endMs - startMs) * 0.05);
  const isLongSpan = endMs - startMs > LONG_SPAN_MS;
  const hasLegend = series.length > 1;

  const tooltipFormatter = (param: { seriesName: string; data: DataPoint }) => {
    const [ms, value] = param.data.value;
    const date = new Date(ms).toISOString().slice(0, 10);
    const lines = [`<b>${formatDate(date)}</b>`, param.data.label, `${param.seriesName}: <b>${format(value)}</b>`];
    return lines.filter(Boolean).join('<br/>');
  };

  return {
    animationDuration: 300,
    legend: hasLegend
      ? {
          top: 0,
          left: 0,
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: ink2, fontSize: 12 },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    grid: { left: 8, right: 16, top: hasLegend ? 36 : 12, bottom: 4, containLabel: true },
    xAxis: {
      type: 'time',
      min: startMs - padMs,
      max: endMs + padMs,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      splitLine: { show: false },
      axisLabel: {
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        formatter: (ms: number) => axisDateLabel(ms, isLongSpan),
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitNumber: 3,
      axisLabel: { color: ink3, fontSize: 11, formatter: (value: number) => format(value) },
      splitLine: { lineStyle: { color: grid } },
    },
    series: series.map((one) => seriesOption(one, endMs, surface)),
  };
};
