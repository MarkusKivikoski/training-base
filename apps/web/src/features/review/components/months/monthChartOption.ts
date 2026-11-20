import { cssVar } from '@/shared/charts/chartTheme';
import { formatHours } from '@/shared/lib/formatters';
import { MONTH_LABELS } from '../../constants';

type MonthChartInput = {
  year: number;
  /** Riding seconds per month, January first. */
  months: readonly number[];
  previousMonths: readonly number[];
  /** Index of the best month. */
  bestIndex: number;
};

const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

/** This year's riding hours as bars (the best month labelled), last year as a dashed line. */
export const monthChartOption = ({ year, months, previousMonths, bestIndex }: MonthChartInput) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const color = cssVar('--series-1');

  const tooltipFormatter = (params: Array<{ dataIndex: number }>) => {
    const i = params[0]?.dataIndex ?? 0;
    const thisYear = `${year}: <b>${formatHours(months[i])}</b>`;
    const lastYear = `${year - 1}: ${formatHours(previousMonths[i])}`;
    return `<b>${MONTH_LABELS[i]}</b><br/>${thisYear}<br/>${lastYear}`;
  };

  return {
    animationDuration: 300,
    legend: {
      top: 0,
      right: 0,
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
    grid: { left: 8, right: 8, top: 32, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: MONTH_LABELS,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'hours',
      nameTextStyle: { color: ink3, align: 'left' },
      splitNumber: 3,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        name: String(year),
        type: 'bar',
        barMaxWidth: 32,
        data: months.map((seconds, i) => ({
          value: toHours(seconds),
          itemStyle: { color, borderRadius: [4, 4, 0, 0] },
          label: {
            show: i === bestIndex && seconds > 0,
            position: 'top',
            color: ink2,
            fontSize: 11,
            formatter: () => `best · ${formatHours(seconds)}`,
          },
        })),
      },
      {
        name: String(year - 1),
        type: 'line',
        data: previousMonths.map(toHours),
        showSymbol: false,
        lineStyle: { width: 1.5, type: 'dashed', color: ink3 },
        itemStyle: { color: ink3 },
      },
    ],
  };
};
