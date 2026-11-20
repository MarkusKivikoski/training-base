import type { GoalMetric, GoalPeriod, GoalProgress } from '@app/metrics';
import type { Goal } from '@/shared/api/client';
import { LOCALE } from '@/shared/lib/formatters';

export const GOAL_METRICS: ReadonlyArray<{ value: GoalMetric; label: string; unit: string; digits: number }> = [
  { value: 'distance', label: 'Distance', unit: 'km', digits: 0 },
  { value: 'time', label: 'Riding time', unit: 'h', digits: 1 },
  { value: 'elevation', label: 'Elevation', unit: 'm', digits: 0 },
  { value: 'rides', label: 'Rides', unit: 'rides', digits: 0 },
];

export const GOAL_PERIODS: ReadonlyArray<{ value: GoalPeriod; label: string; current: string }> = [
  { value: 'week', label: 'per week', current: 'this week' },
  { value: 'month', label: 'per month', current: 'this month' },
  { value: 'year', label: 'per year', current: 'this year' },
];

export const goalMetricInfo = (metric: GoalMetric) => GOAL_METRICS.find((m) => m.value === metric)!;
export const goalPeriodInfo = (period: GoalPeriod) => GOAL_PERIODS.find((p) => p.value === period)!;

/** "1,842 km", "5.5 h", "12 rides", "1 ride". */
export const formatGoalAmount = (value: number, metric: GoalMetric, digits = goalMetricInfo(metric).digits) => {
  const number = value.toLocaleString(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  if (metric === 'rides') return `${number} ${Math.round(value) === 1 ? 'ride' : 'rides'}`;
  return `${number} ${goalMetricInfo(metric).unit}`;
};

/** "3,000 km per year". */
export const goalLabel = (goal: Pick<Goal, 'metric' | 'period' | 'target'>) =>
  `${formatGoalAmount(goal.target, goal.metric)} ${goalPeriodInfo(goal.period).label}`;

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** What's still needed: "Need 73 km/week from here", "20 km to go, 3 days left", "Done with 5 days to spare". */
export const describeGoalNeed = (goal: Goal, progress: GoalProgress): string => {
  const daysLeft = progress.daysTotal - progress.daysElapsed;
  if (progress.state === 'achieved') return `Done with ${days(daysLeft)} to spare`;

  const isShortPeriod = goal.period === 'week' || progress.neededPerWeek === null;
  if (isShortPeriod) {
    const remaining = formatGoalAmount(progress.target - progress.current, goal.metric);
    if (daysLeft === 0) return `${remaining} to go by the end of today`;
    return `${remaining} to go, ${days(daysLeft)} left`;
  }

  const digits = goal.metric === 'time' ? 1 : 0;
  return `Need ${formatGoalAmount(progress.neededPerWeek!, goal.metric, digits)}/week from here`;
};

/** "+114 km vs pace" or "−1.8 h vs pace". */
export const describeGoalPace = (goal: Goal, progress: GoalProgress): string => {
  const difference = progress.current - progress.expected;
  const sign = difference >= 0 ? '+' : '−';
  return `${sign}${formatGoalAmount(Math.abs(difference), goal.metric)} vs pace`;
};
