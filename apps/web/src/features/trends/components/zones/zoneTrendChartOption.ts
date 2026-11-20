import type { Zone } from '@app/metrics';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatHours, formatMonth, formatShortDate } from '@/shared/lib/formatters';
import { totalSeconds, zoneBarValue, type ZoneUnit } from '../../lib/zoneTime';
import { channelName, type ZoneChannel, type ZonePeriod, type ZonePeriodRow } from './zoneTrendTypes';

type ZoneTrendInput = {
  rows: readonly ZonePeriodRow[];
  zones: readonly Zone[];
  channel: ZoneChannel;
  period: ZonePeriod;
  unit: ZoneUnit;
};

const periodHeading = (row: ZonePeriodRow, period: ZonePeriod) =>
  period === 'week' ? `Week of ${formatDate(row.period)}` : formatMonth(row.period);

const periodAxisLabel = (row: ZonePeriodRow, period: ZonePeriod) =>
  period === 'week' ? formatShortDate(row.period) : formatMonth(row.period);

/** Time in zones as stacked bars per period, in the zone ramp colours (Z1 at the bottom). */
export const zoneTrendChartOption = ({ rows, zones, channel, period, unit }: ZoneTrendInput) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const colors = zones.map((_, i) => cssVar(`--zone-${channel}-${i + 1}`));
  const isShare = unit === 'share';

  const tooltipFormatter = (params: Array<{ dataIndex: number }>) => {
    const row = rows[params[0]?.dataIndex ?? 0];
    if (!row) return '';
    const seconds = row[channel];
    const total = totalSeconds(seconds);
    const heading = periodHeading(row, period);
    if (total === 0) return `<b>${heading}</b><br/>No ${channelName(channel)} data`;

    const zoneLines = zones.map((zone, i) => {
      const inZone = seconds[i] ?? 0;
      const percent = Math.round((inZone / total) * 100);
      return `Z${i + 1} ${zone.name}: <b>${formatHours(inZone)}</b> (${percent}%)`;
    });
    // Hardest zone first, matching the stack from the top.
    return [`<b>${heading}</b> · ${formatHours(total)}`, ...zoneLines.reverse()].join('<br/>');
  };

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
      formatter: tooltipFormatter,
    },
    grid: { left: 8, right: 8, top: 56, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map((row) => periodAxisLabel(row, period)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      max: isShare ? 100 : undefined,
      splitNumber: 4,
      axisLabel: { color: ink3, fontSize: 11, formatter: (value: number) => (isShare ? `${value}%` : `${value} h`) },
      splitLine: { lineStyle: { color: grid } },
    },
    series: zones.map((zone, i) => ({
      name: `Z${i + 1} ${zone.name}`,
      type: 'bar',
      stack: 'zones',
      data: rows.map((row) => zoneBarValue(row[channel], i, unit)),
      barMaxWidth: period === 'week' ? 18 : 14,
      itemStyle: { color: colors[i], borderColor: surface, borderWidth: 2 },
    })),
  };
};
