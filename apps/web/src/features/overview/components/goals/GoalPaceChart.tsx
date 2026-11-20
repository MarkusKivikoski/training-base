import type { GoalProgress } from '@app/metrics';
import { useMemo } from 'react';
import { cssVar, useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { formatShortDate } from '@/shared/lib/formatters';
import type { Goal } from '@/shared/api/client';
import { toLocalIsoDate } from '@/shared/lib/dates';
import { formatGoalAmount, goalMetricInfo } from '../../lib/goalText';

type GoalPaceChartProps = {
  goal: Goal;
  progress: GoalProgress;
};

const buildPaceChartOption = (goal: Goal, progress: GoalProgress) => {
  const ink = cssVar('--text-primary');
  const ink2 = cssVar('--text-secondary');
  const ink3 = cssVar('--text-muted');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface-1');
  const color = cssVar('--series-1');
  const digits = goalMetricInfo(goal.metric).digits;

  return {
    animation: false,
    grid: { left: 56, right: 16, top: 28, bottom: 28 },
    legend: {
      top: 0,
      left: 0,
      data: ['Actual', 'Even pace'],
      textStyle: { color: ink2, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 8,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      valueFormatter: (value: number) => formatGoalAmount(value, goal.metric, digits),
    },
    xAxis: {
      type: 'time',
      min: progress.start,
      max: progress.end,
      axisLabel: {
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        formatter: (ms: number) => formatShortDate(toLocalIsoDate(new Date(ms))),
      },
      axisLine: { lineStyle: { color: grid } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      max: Math.max(progress.target, progress.current),
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        name: 'Actual',
        type: 'line',
        data: progress.cumulative.map((day) => [day.date, day.value]),
        showSymbol: false,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.12 },
      },
      {
        name: 'Even pace',
        type: 'line',
        data: [
          [progress.start, 0],
          [progress.end, progress.target],
        ],
        showSymbol: false,
        lineStyle: { width: 1.5, type: 'dashed', color: ink3 },
        itemStyle: { color: ink3 },
        tooltip: { show: false },
      },
    ],
  };
};

/** Running total so far against a straight line from 0 to the target over the period. */
export const GoalPaceChart = ({ goal, progress }: GoalPaceChartProps) => {
  const scheme = useColorScheme();
  // `scheme` re-reads the colour tokens when the theme changes.
  const option = useMemo(() => buildPaceChartOption(goal, progress), [goal, progress, scheme]);

  return (
    <EChart
      option={option}
      className="mt-3 h-56"
      ariaLabel={`Running total ${formatGoalAmount(progress.current, goal.metric)} of ${formatGoalAmount(progress.target, goal.metric)} so far, against an even pace line.`}
    />
  );
};
