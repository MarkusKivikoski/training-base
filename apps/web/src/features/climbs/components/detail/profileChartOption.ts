import type { ClimbDetail } from '@/shared/api/client';
import { cssVar } from '@/shared/charts/chartTheme';

/** Altitude over distance along the climb, as a filled line. */
export const profileChartOption = (profile: ClimbDetail['profile']) => {
  const ink = cssVar('--text-primary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const color = cssVar('--series-1');

  const tooltipFormatter = (params: Array<{ value: [number, number] }>) => {
    const point = params[0];
    if (!point) return '';
    const [distanceM, altitudeM] = point.value;
    return `${distanceM} m: <b>${altitudeM.toFixed(0)} m</b> altitude`;
  };

  return {
    animation: false,
    grid: { left: 44, right: 16, top: 16, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: profile.at(-1)?.[0],
      axisLabel: { color: ink3, fontSize: 11, showMaxLabel: false, formatter: (metres: number) => `${metres} m` },
      splitLine: { show: false },
      axisLine: { lineStyle: { color: grid } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: 'm',
      nameTextStyle: { color: ink3 },
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        type: 'line',
        data: profile,
        showSymbol: false,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.15 },
      },
    ],
  };
};
