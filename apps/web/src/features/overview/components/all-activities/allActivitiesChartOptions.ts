import type { LoadCategory, WeekCategoryLoad } from '@app/metrics';
import { cssVar } from '@/shared/charts/chartTheme';
import { formatDate, formatLoad, formatShortDate, formatTss } from '@/shared/lib/formatters';
import type { DayLoad } from '@/shared/api/client';
import { toLocalIsoDate } from '@/shared/lib/dates';
import { LOAD_CATEGORY_LOOK, weekTotal } from '../../lib/allActivitiesLoad';

const themeColors = () => ({
  ink: cssVar('--text-primary'),
  ink2: cssVar('--text-secondary'),
  ink3: cssVar('--text-muted'),
  grid: cssVar('--grid'),
  surface: cssVar('--surface-1'),
});

const weekTooltip = (week: WeekCategoryLoad, groups: readonly LoadCategory[]) =>
  [
    `<b>Week of ${formatDate(week.weekStart)}</b>`,
    ...groups
      .filter((group) => week[group] > 0)
      .map((group) => `${LOAD_CATEGORY_LOOK[group].label}: <b>${formatTss(week[group])}</b>`),
    `Total: ${formatTss(weekTotal(week))} TSS`,
  ].join('<br/>');

/** Weekly TSS stacked by activity group, one colour per group. */
export const buildCategoryLoadOption = (weeks: readonly WeekCategoryLoad[], groups: readonly LoadCategory[]) => {
  const { ink, ink2, ink3, grid, surface } = themeColors();
  const topGroup = groups.at(-1);

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
      formatter: (params: Array<{ dataIndex: number }>) => {
        const week = weeks[params[0]?.dataIndex ?? 0];
        return week ? weekTooltip(week, groups) : '';
      },
    },
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((week) => formatShortDate(week.weekStart)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink3, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      name: 'TSS / week',
      nameTextStyle: { color: ink3, align: 'left' },
      splitNumber: 3,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: groups.map((group) => ({
      name: LOAD_CATEGORY_LOOK[group].label,
      type: 'bar',
      stack: 'load',
      barMaxWidth: 28,
      data: weeks.map((week) => Math.round(week[group])),
      itemStyle: {
        color: cssVar(LOAD_CATEGORY_LOOK[group].color),
        borderColor: surface,
        borderWidth: 1,
        // Round only the top of the stack.
        borderRadius: group === topGroup ? [4, 4, 0, 0] : 0,
      },
    })),
  };
};

/** Fitness (CTL) from cycling only against fitness from all activities, on one axis. */
export const buildFitnessComparisonOption = (
  cyclingDays: readonly DayLoad[],
  allDays: readonly DayLoad[],
  range: { from: string; to: string },
) => {
  const { ink, ink2, ink3, grid, surface } = themeColors();
  const cycling = cssVar('--series-1');

  return {
    animationDuration: 300,
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: ink2, fontSize: 12 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: ink, fontSize: 12 },
      valueFormatter: (value: number) => formatLoad(value),
    },
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    xAxis: {
      type: 'time',
      min: range.from,
      max: range.to,
      axisLine: { lineStyle: { color: grid } },
      axisLabel: {
        color: ink3,
        fontSize: 11,
        hideOverlap: true,
        formatter: (ms: number) => formatShortDate(toLocalIsoDate(new Date(ms))),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Fitness (CTL)',
      nameTextStyle: { color: ink3, align: 'left' },
      splitNumber: 3,
      axisLabel: { color: ink3, fontSize: 11 },
      splitLine: { lineStyle: { color: grid } },
    },
    series: [
      {
        name: 'Cycling',
        type: 'line',
        data: cyclingDays.map((day) => [day.date, day.ctl]),
        showSymbol: false,
        lineStyle: { width: 2, color: cycling },
        itemStyle: { color: cycling },
      },
      {
        name: 'All activities',
        type: 'line',
        data: allDays.map((day) => [day.date, day.ctl]),
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed', color: ink2 },
        itemStyle: { color: ink2 },
      },
    ],
  };
};
