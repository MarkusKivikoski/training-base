import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatLoad, formatShortDate, formatTss } from '@/shared/lib/formatters';
import type { PlannedEvent } from '@/shared/api/client';
import type { FitnessRow } from '../../lib/fitnessRows';
import { describeDayZoneLines } from '../../lib/zoneText';

const SAFE_FATIGUE_LABEL = 'Safe fatigue (0.8–1.3× fitness)';

/** Zone washes behind the form bars, low to high. Neutral has no wash. */
export const formZoneWashes = () => [
  { name: 'High risk', color: cssVar('--status-critical'), opacity: 0.14 },
  { name: 'Optimal training', color: cssVar('--status-good'), opacity: 0.14 },
  { name: 'Neutral', color: 'transparent', opacity: 0 },
  { name: 'Fresh', color: cssVar('--text-muted'), opacity: 0.1 },
  { name: 'Transition', color: cssVar('--status-warning'), opacity: 0.16 },
];

/** Invisible series that only carry a stacked band's lower edge or a wash. */
const BAND_BASE = {
  type: 'line',
  showSymbol: false,
  silent: true,
  lineStyle: { opacity: 0 },
  tooltip: { show: false },
  z: 0,
} as const;

/** Fixed form-axis range, so the outer zones can fill to the edges. */
const formAxisRange = (rows: readonly FitnessRow[]) => {
  const maxCtl = Math.max(1, ...rows.map((row) => row.ctl));
  const tsbs = rows.map((row) => row.tsb);
  return {
    min: Math.floor(Math.min(-0.45 * maxCtl, ...tsbs) * 1.15),
    max: Math.ceil(Math.max(0.3 * maxCtl, ...tsbs, 1) * 1.15),
  };
};

/** The translucent zone bands: the safe-fatigue band in the top panel, form zones in the bottom one. */
const bandSeries = (rows: readonly FitnessRow[], formMin: number, formMax: number) => {
  const good = cssVar('--status-good');
  return [
    // Top panel: safe fatigue = fitness × 0.8 to fitness × 1.3, as a stack on its lower edge.
    {
      ...BAND_BASE,
      name: '_fatigueLow',
      xAxisIndex: 0,
      yAxisIndex: 0,
      stack: 'fatigue',
      data: rows.map((row) => row.bands?.fatigueLow ?? null),
    },
    {
      ...BAND_BASE,
      name: SAFE_FATIGUE_LABEL,
      xAxisIndex: 0,
      yAxisIndex: 0,
      stack: 'fatigue',
      data: rows.map((row) => (row.bands ? row.bands.fatigueHigh - row.bands.fatigueLow : null)),
      areaStyle: { color: good, opacity: 0.12 },
      itemStyle: { color: good },
    },
    // Bottom panel: form zones stacked from the axis minimum up to its maximum.
    {
      ...BAND_BASE,
      name: '_formBase',
      xAxisIndex: 1,
      yAxisIndex: 1,
      stack: 'form',
      stackStrategy: 'all',
      data: rows.map((row) => (row.bands ? formMin : null)),
    },
    ...formZoneWashes().map((wash, zoneIndex) => ({
      ...BAND_BASE,
      name: `_zone${zoneIndex}`,
      xAxisIndex: 1,
      yAxisIndex: 1,
      stack: 'form',
      stackStrategy: 'all',
      data: rows.map((row) => {
        if (!row.bands) return null;
        const edges = [formMin, ...row.bands.formEdges, formMax];
        return Math.max(0, edges[zoneIndex + 1]! - edges[zoneIndex]!);
      }),
      areaStyle: { color: wash.color, opacity: wash.opacity },
    })),
  ];
};

const tooltipText = (row: FitnessRow) =>
  [
    row.isPlanned ? `<b>${formatDate(row.date)}</b> · forecast` : `<b>${formatDate(row.date)}</b>`,
    row.isPlanned ? `Planned TSS: <b>${formatTss(row.tss)}</b>` : `TSS that day: <b>${formatTss(row.tss)}</b>`,
    `Fitness (CTL): <b>${formatLoad(row.ctl)}</b>`,
    `Fatigue (ATL): <b>${formatLoad(row.atl)}</b>`,
    `Form (TSB): <b>${formatLoad(row.tsb, true)}</b>`,
    ...describeDayZoneLines(row.status),
  ].join('<br/>');

type LoadLine = { name: string; key: 'ctl' | 'atl'; slot: string; endName: string };

/**
 * One load line as two series with the same name (so the legend shows it once): solid for ridden
 * days, dashed for forecast days. The dashed one starts on the last ridden day so the line is unbroken.
 */
const loadLineSeries = (
  { name, key, slot, endName }: LoadLine,
  rows: readonly FitnessRow[],
  lastRiddenIndex: number,
  endLabel: (name: string) => object,
  todayMark: object | undefined,
) => {
  const color = cssVar(slot);
  const hasForecast = lastRiddenIndex >= 0 && lastRiddenIndex < rows.length - 1;
  const base = { name, type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, z: 3, itemStyle: { color } };
  const ridden = {
    ...base,
    data: rows.map((row) => (row.isPlanned ? null : row[key])),
    lineStyle: { width: 2, color },
    ...(hasForecast ? {} : { endLabel: endLabel(endName) }),
    ...(todayMark ? { markLine: todayMark } : {}),
  };
  if (!hasForecast) return [ridden];

  const forecast = {
    ...base,
    data: rows.map((row, index) => (row.isPlanned || index === lastRiddenIndex ? row[key] : null)),
    lineStyle: { width: 2, color, type: 'dashed' },
    endLabel: endLabel(endName),
  };
  return [ridden, forecast];
};

/**
 * Fitness (CTL) and fatigue (ATL) as lines in the top panel, form (TSB) as bars in the bottom
 * panel: one y-axis each, a shared date axis and crosshair. Series slots: CTL = 1, ATL = 2, TSB = 3.
 */
export const buildFitnessChartOption = (
  rows: readonly FitnessRow[],
  hasBands: boolean,
  todayDate: string,
  events: readonly PlannedEvent[] = [],
) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const lastIndex = rows.length - 1;
  const lastRiddenIndex = rows.findLastIndex((row) => !row.isPlanned);
  const hasForecast = lastRiddenIndex >= 0 && lastRiddenIndex < lastIndex;
  const formRange = formAxisRange(rows);
  // A "Today" line at today's date (or the last ridden day, if today isn't in the chart), and a flag line per
  // target event in the chart.
  const todayRow = rows.find((row) => row.date === todayDate) ?? rows[lastRiddenIndex];
  const shownDates = new Set(rows.map((row) => row.date));
  const eventMarks = events
    .filter((event) => shownDates.has(event.date))
    .map((event) => ({
      xAxis: event.date,
      lineStyle: { color: ink2, type: 'dashed', width: 1 },
      label: { formatter: `⚑ ${event.name}`, color: ink, fontSize: 11, position: 'insideEndTop' },
    }));
  const markData = [...(hasForecast && todayRow ? [{ xAxis: todayRow.date }] : []), ...eventMarks];
  const todayMark =
    markData.length > 0
      ? {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ink3, type: 'solid', width: 1 },
          label: { formatter: 'Today', color: ink2, fontSize: 11, position: 'insideEndTop' },
          data: markData,
        }
      : undefined;

  const endLabel = (name: string) => ({
    show: true,
    formatter: (point: { value: number }) => `${name} ${formatLoad(point.value)}`,
    color: ink2,
    fontSize: 11,
  });

  const formBar = (row: FitnessRow, index: number) => {
    const isPositive = row.tsb >= 0;
    const isLast = index === lastIndex;
    return {
      value: row.tsb,
      // Round only the data end: the top of positive bars, the bottom of negative ones. Forecast bars are faint.
      itemStyle: { borderRadius: isPositive ? [3, 3, 0, 0] : [0, 0, 3, 3], opacity: row.isPlanned ? 0.4 : 1 },
      label: isLast
        ? {
            show: true,
            position: isPositive ? 'top' : 'bottom',
            color: ink2,
            fontSize: 11,
            formatter: () => `TSB ${formatLoad(row.tsb, true)}`,
          }
        : undefined,
    };
  };

  return {
    animationDuration: 300,
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      data: ['Fitness (CTL)', 'Fatigue (ATL)', 'Form (TSB)', ...(hasBands ? [SAFE_FATIGUE_LABEL] : [])],
      textStyle: { color: ink2, fontSize: 12 },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: ink3 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = rows[params[0]?.dataIndex ?? 0];
        return row ? tooltipText(row) : '';
      },
    },
    grid: [
      { left: 8, right: 96, top: 36, height: '52%', containLabel: true },
      { left: 8, right: 96, top: '72%', bottom: 8, containLabel: true },
    ],
    xAxis: [0, 1].map((gridIndex) => ({
      type: 'category',
      gridIndex,
      data: rows.map((row) => row.date),
      boundaryGap: true,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: {
        show: gridIndex === 1,
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        formatter: (date: string) => formatShortDate(date),
      },
    })),
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        splitNumber: 3,
        axisLabel: { color: ink3, fontSize: 11 },
        splitLine: { lineStyle: { color: grid } },
      },
      {
        type: 'value',
        gridIndex: 1,
        splitNumber: 2,
        ...(hasBands ? formRange : {}),
        axisLabel: { color: ink3, fontSize: 11 },
        splitLine: { lineStyle: { color: grid } },
      },
    ],
    series: [
      ...(hasBands ? bandSeries(rows, formRange.min, formRange.max) : []),
      ...loadLineSeries(
        { name: 'Fitness (CTL)', key: 'ctl', slot: '--series-1', endName: 'CTL' },
        rows,
        lastRiddenIndex,
        endLabel,
        todayMark,
      ),
      ...loadLineSeries(
        { name: 'Fatigue (ATL)', key: 'atl', slot: '--series-2', endName: 'ATL' },
        rows,
        lastRiddenIndex,
        endLabel,
        undefined,
      ),
      {
        name: 'Form (TSB)',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        z: 3,
        data: rows.map(formBar),
        barMaxWidth: 10,
        itemStyle: { color: cssVar('--series-3') },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: ink3, type: 'solid', width: 1 },
          data: [{ yAxis: 0 }],
        },
      },
    ],
  };
};
