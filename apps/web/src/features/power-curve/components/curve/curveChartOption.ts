import { powerFromModel, type CriticalPower, type CurvePoint } from '@app/metrics';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatDurationLabel, formatPower, formatWattsPerKg } from '@/shared/lib/formatters';
import { AXIS_TICKS, MAX_DURATION_S } from '../../constants';
import { plottedValue, pointAt, pointWattsPerKg, type KgForDate } from '../../lib/curveValues';

type CurveChartInput = {
  /** One or two curves: the chosen range, then the comparison. */
  curves: readonly CurvePoint[][];
  names: readonly string[];
  kgFor: KgForDate;
  /** Plot W/kg (weight on each ride's date) instead of watts. */
  perKg: boolean;
  /** Critical power model, drawn dashed over the durations it was fitted to (watts view only). */
  model?: CriticalPower | null | undefined;
};

const MODEL_NAME = 'CP model';

/** Points along the model from its shortest to its longest fitted duration. */
const modelPoints = (model: CriticalPower): Array<[number, number]> => {
  const first = model.durationsS[0]!;
  const last = model.durationsS.at(-1)!;
  const points: Array<[number, number]> = [];
  for (let durationS = first; durationS <= last; durationS = Math.ceil(durationS * 1.15)) {
    points.push([durationS, Math.round(powerFromModel(model, durationS))]);
  }
  points.push([last, Math.round(powerFromModel(model, last))]);
  return points;
};

type TooltipParam = { seriesIndex: number; dataIndex: number };

/** Best power by duration on a log axis, one line per range. */
export const curveChartOption = ({ curves, names, kgFor, perKg, model }: CurveChartInput) => {
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const colors = [cssVar('--series-1'), cssVar('--series-2')];
  const isComparing = curves.length > 1;
  const showsModel = Boolean(model) && !perKg;
  const hasLegend = isComparing || showsModel;

  const effortLine = (point: CurvePoint, name: string) => {
    const wattsPerKg = pointWattsPerKg(point, kgFor);
    const perKgText = wattsPerKg ? ` · ${formatWattsPerKg(wattsPerKg)}` : '';
    const ride = `<span style="opacity:.75">${formatDate(point.date)} · ${point.name ?? ''}</span>`;
    return `${name}: <b>${formatPower(point.watts)}</b>${perKgText}<br/>${ride}`;
  };

  const tooltipFormatter = (allParams: TooltipParam[]) => {
    // The model line has no rides behind it, so it stays out of the tooltip.
    const params = allParams.filter((param) => param.seriesIndex < curves.length);
    const first = params[0];
    if (!first) return '';
    const durationS = curves[first.seriesIndex]![first.dataIndex]!.durationS;
    const lines = [`<b>${formatDurationLabel(durationS)}</b>`];
    curves.forEach((curve, i) => {
      const point = pointAt(curve, durationS);
      if (point) lines.push(effortLine(point, names[i] ?? ''));
    });
    lines.push('<span style="opacity:.6">Click a point to open the ride</span>');
    return lines.join('<br/>');
  };

  return {
    animationDuration: 300,
    grid: { left: 8, right: 16, top: hasLegend ? 36 : 16, bottom: 8, containLabel: true },
    // A legend when there's more than one line; a single curve is named by the card title.
    legend: hasLegend
      ? {
          top: 0,
          left: 0,
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: ink2, fontSize: 12 },
        }
      : { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: ink3 } },
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: cssVar('--text-primary'), fontSize: 12 },
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: 'log',
      logBase: 10,
      min: 1,
      max: MAX_DURATION_S,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { customValues: AXIS_TICKS },
      axisLabel: {
        customValues: AXIS_TICKS,
        color: ink3,
        fontSize: 11,
        hideOverlap: true, // Narrow screens drop labels rather than overlapping them.
        formatter: (seconds: number) => formatDurationLabel(seconds),
      },
      splitLine: { show: true, lineStyle: { color: grid } },
      minorSplitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: ink3, fontSize: 11, formatter: (value: number) => (perKg ? `${value} W/kg` : `${value} W`) },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      ...curves.map((curve, i) => ({
        name: names[i],
        type: 'line',
        data: curve.map((point) => [point.durationS, plottedValue(point, kgFor, perKg)]),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2, color: colors[i] },
        // A surface-coloured ring keeps overlapping markers distinct.
        itemStyle: { color: colors[i], borderColor: surface, borderWidth: 2 },
        emphasis: { scale: 1.4 },
      })),
      ...(showsModel && model
        ? [
            {
              name: MODEL_NAME,
              type: 'line',
              data: modelPoints(model),
              showSymbol: false,
              silent: true,
              tooltip: { show: false },
              z: 1,
              lineStyle: { width: 1.5, type: 'dashed', color: ink3 },
              itemStyle: { color: ink3 },
            },
          ]
        : []),
    ],
  };
};
