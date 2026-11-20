import { cssVar } from '@/shared/charts/chartTheme';
import { formatDistance, formatElevation, formatHours } from '@/shared/lib/formatters';
import { bucketValue, toHours, type Granularity, type VolumeBucket } from '../../lib/volumeBuckets';
import { VOLUME_METRIC_INFO, type VolumeMetric } from '../../lib/volumeMetrics';

/** Colour slot per measure. Hours is stacked indoor (slot 1) / outdoor (slot 2). */
const METRIC_SLOT: Record<Exclude<VolumeMetric, 'hours'>, string> = {
  distanceKm: '--series-3',
  elevationM: '--series-4',
  rides: '--series-5',
};

/** Chart layout in pixels. */
const MAIN_HEIGHT = 300;
const STRENGTH_HEIGHT = 64;
const GAP = 40;
const LEGEND_HEIGHT = 32;
const BOTTOM = 28;
/** Horizontal room per extra y-axis when several measures share the chart. */
const AXIS_WIDTH = 58;

export const VOLUME_CHART_HEIGHT = LEGEND_HEIGHT + MAIN_HEIGHT + GAP + STRENGTH_HEIGHT + BOTTOM;

const ROUNDED_TOP = { borderRadius: [3, 3, 0, 0] };
const roundedBar = (value: number) => ({ value, itemStyle: ROUNDED_TOP });

const metricColor = (metric: VolumeMetric) => cssVar(metric === 'hours' ? '--series-2' : METRIC_SLOT[metric]);

/** Axis i sits left, right, outer left, outer right. */
const axisSide = (i: number) => (i % 2 === 0 ? 'left' : 'right');
const axisOffset = (i: number) => (i >= 2 ? AXIS_WIDTH : 0);

/** One measure: a plain title. Several: each axis is tied to its bars by colour and unit. */
const axisName = (metric: VolumeMetric, isOnlyMetric: boolean) => {
  const info = VOLUME_METRIC_INFO[metric];
  if (!isOnlyMetric) return metric === 'rides' ? 'rides' : info.axisUnit;
  return info.axisUnit ? `${info.title} (${info.axisUnit})` : info.title;
};

const legendNames = (metric: VolumeMetric) =>
  metric === 'hours' ? ['Indoor hours', 'Outdoor hours'] : [VOLUME_METRIC_INFO[metric].title];

type VolumeChartInput = {
  buckets: readonly VolumeBucket[];
  metrics: readonly VolumeMetric[];
  granularity: Granularity;
};

const metricSeries = (
  metric: VolumeMetric,
  i: number,
  buckets: readonly VolumeBucket[],
  barMaxWidth: number,
  surface: string,
): Array<Record<string, unknown>> => {
  const axis = { xAxisIndex: 0, yAxisIndex: i, barMaxWidth, barGap: '15%' };

  if (metric !== 'hours') {
    return [
      {
        ...axis,
        name: VOLUME_METRIC_INFO[metric].title,
        type: 'bar',
        data: buckets.map((bucket) => roundedBar(bucketValue(bucket, metric))),
        itemStyle: { color: metricColor(metric) },
      },
    ];
  }

  return [
    {
      ...axis,
      name: 'Indoor hours',
      type: 'bar',
      stack: 'hours',
      // Indoor sits below outdoor, so it only gets the rounded top when there's no outdoor time.
      data: buckets.map((bucket) => ({
        value: toHours(bucket.indoorS),
        itemStyle: { borderRadius: bucket.outdoorS === 0 ? [3, 3, 0, 0] : 0 },
      })),
      itemStyle: { color: cssVar('--series-1'), borderColor: surface, borderWidth: 1 },
    },
    {
      ...axis,
      name: 'Outdoor hours',
      type: 'bar',
      stack: 'hours',
      data: buckets.map((bucket) => roundedBar(toHours(bucket.outdoorS))),
      itemStyle: { color: cssVar('--series-2'), borderColor: surface, borderWidth: 1 },
    },
  ];
};

/**
 * Riding volume as grouped bars, each selected measure on its own y-axis in its bar colour,
 * with strength sessions as a separate grey strip below.
 */
export const volumeChartOption = ({ buckets, metrics, granularity }: VolumeChartInput) => {
  const surface = cssVar('--surface-1');
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const metricCount = metrics.length;
  const isOnlyMetric = metricCount === 1;

  // Narrower bars when several share a slot.
  const barMaxWidth =
    granularity === 'month' ? Math.max(4, 14 - 3 * (metricCount - 1)) : Math.max(14, 48 - 10 * (metricCount - 1));

  // Fixed margins (room for each axis on that side), identical for both grids so the periods line up.
  const leftAxes = metrics.filter((_, i) => i % 2 === 0).length;
  const rightAxes = metricCount - leftAxes;
  const gridSides = {
    left: 8 + Math.max(1, leftAxes) * AXIS_WIDTH,
    right: 8 + Math.max(rightAxes * AXIS_WIDTH, 8),
  };

  const tooltipFormatter = (params: Array<{ dataIndex: number }>) => {
    const bucket = buckets[params[0]?.dataIndex ?? 0];
    if (!bucket) return '';
    const movingS = bucket.indoorS + bucket.outdoorS;
    return [
      `<b>${bucket.label}</b>`,
      `Moving time: ${formatHours(movingS)} (indoor ${formatHours(bucket.indoorS)}, outdoor ${formatHours(bucket.outdoorS)})`,
      `Distance: ${formatDistance(bucket.distanceM, 0)} · Elevation: ${formatElevation(bucket.elevationGainM)}`,
      `Rides: ${bucket.rides} · Strength sessions: ${bucket.strengthSessions}`,
    ].join('<br/>');
  };

  const metricAxes = metrics.map((metric, i) => {
    const color = metricColor(metric);
    return {
      type: 'value',
      gridIndex: 0,
      position: axisSide(i),
      offset: axisOffset(i),
      name: axisName(metric, isOnlyMetric),
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: {
        color: isOnlyMetric ? ink2 : color,
        fontSize: 12,
        fontWeight: isOnlyMetric ? 'normal' : 'bold',
      },
      splitNumber: 4,
      minInterval: 1,
      alignTicks: i > 0,
      axisLine: { show: !isOnlyMetric, lineStyle: { color } },
      axisLabel: { color: isOnlyMetric ? ink3 : color, fontSize: 11 },
      splitLine: { show: i === 0, lineStyle: { color: grid } },
    };
  });

  return {
    animationDuration: 300,
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: ink2, fontSize: 12 },
      data: [...metrics.flatMap(legendNames), 'Strength sessions'],
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: grid, opacity: 0.5 } },
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    grid: [
      { ...gridSides, top: LEGEND_HEIGHT + 20, height: MAIN_HEIGHT - 20 },
      { ...gridSides, top: LEGEND_HEIGHT + MAIN_HEIGHT + GAP, height: STRENGTH_HEIGHT },
    ],
    xAxis: [0, 1].map((gridIndex) => ({
      type: 'category',
      gridIndex,
      data: buckets.map((bucket) => bucket.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { show: gridIndex === 1, color: ink3, fontSize: 11, hideOverlap: true },
    })),
    yAxis: [
      ...metricAxes,
      {
        type: 'value',
        gridIndex: 1,
        name: 'Strength sessions',
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: { color: ink2, fontSize: 12, align: 'left', padding: [0, 0, 0, -48] },
        splitNumber: 2,
        minInterval: 1,
        axisLabel: { color: ink3, fontSize: 11 },
        splitLine: { lineStyle: { color: grid } },
      },
    ],
    series: [
      ...metrics.flatMap((metric, i) => metricSeries(metric, i, buckets, barMaxWidth, surface)),
      {
        name: 'Strength sessions',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: metricCount,
        data: buckets.map((bucket) => roundedBar(bucket.strengthSessions)),
        barMaxWidth: granularity === 'month' ? 14 : 48,
        // Neutral grey: slot 5 belongs to rides, and strength is not a riding measure.
        itemStyle: { color: ink3 },
      },
    ],
  };
};
