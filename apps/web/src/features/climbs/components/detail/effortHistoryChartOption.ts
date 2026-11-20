import type { ClimbDetail } from '@/shared/api/client';
import { cssVar } from '@/shared/charts/chartTheme';
import { ordinal } from '@/shared/lib/climbs';
import { formatClock, formatDate } from '@/shared/lib/formatters';
import { historyTimeCap, monthYear } from '../../lib/efforts';

type HistoryPoint = { value: [string, number]; rank: number; timeS: number };

/**
 * Each effort's time by date; the best is drawn larger. Lower is faster. Efforts slower than the
 * cap sit at the top as triangles.
 */
export const effortHistoryChartOption = (climb: ClimbDetail) => {
  const ink = cssVar('--text-primary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const color = cssVar('--series-1');
  const capS = historyTimeCap(climb.efforts);
  const effortCount = climb.efforts.length;

  const tooltipFormatter = (param: { data: HistoryPoint }) => {
    const { value, timeS, rank } = param.data;
    return `${formatDate(value[0])}: <b>${formatClock(timeS)}</b> · ${ordinal(rank)} of ${effortCount}`;
  };

  return {
    animation: false,
    grid: { left: 52, right: 16, top: 16, bottom: 28 },
    tooltip: {
      trigger: 'item',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: ink3, fontSize: 11, hideOverlap: true, formatter: (ms: number) => monthYear(new Date(ms)) },
      axisLine: { lineStyle: { color: grid } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      max: capS,
      name: 'time (lower is faster)',
      nameTextStyle: { color: ink3, align: 'left' },
      axisLabel: { color: ink3, fontSize: 11, formatter: (seconds: number) => formatClock(seconds) },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        type: 'scatter',
        data: climb.efforts.map((effort) => {
          const isOverCap = effort.timeS > capS;
          return {
            value: [effort.date, Math.min(effort.timeS, capS)],
            timeS: effort.timeS,
            rank: effort.rank,
            symbol: isOverCap ? 'triangle' : 'circle',
            symbolSize: effort.rank === 1 ? 14 : 9,
          };
        }),
        itemStyle: { color, borderColor: surface, borderWidth: 2 },
      },
    ],
  };
};
