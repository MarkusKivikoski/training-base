import type { LoadStatus } from './loadStatus.js';
import { addDays, isoWeekStart, rideTimeS, type VolumeInput } from './weeklyVolume.js';

export type GoalMetric = 'distance' | 'time' | 'elevation' | 'rides';
export type GoalPeriod = 'week' | 'month' | 'year';

export interface GoalInput {
  metric: GoalMetric;
  period: GoalPeriod;
  /** In display units: km, hours, metres or rides. */
  target: number;
}

/** A ride's contribution to a goal, in the goal's units (km, hours, metres, rides). */
export function goalValue(ride: VolumeInput, metric: GoalMetric): number {
  switch (metric) {
    case 'distance':
      return (ride.distanceM ?? 0) / 1000;
    case 'time':
      return rideTimeS(ride) / 3600;
    case 'elevation':
      return ride.elevationGainM ?? 0;
    case 'rides':
      return 1;
  }
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** First and last day (inclusive) of the week (ISO, from Monday), month or year containing `date`. */
export function periodBounds(period: GoalPeriod, date: string): { start: string; end: string } {
  if (period === 'week') {
    const start = isoWeekStart(date);
    return { start, end: addDays(start, 6) };
  }
  if (period === 'month') {
    const start = `${date.slice(0, 7)}-01`;
    const [y, m] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { start, end: addDays(next, -1) };
  }
  return { start: `${date.slice(0, 4)}-01-01`, end: `${date.slice(0, 4)}-12-31` };
}

/** Pace thresholds: actual ÷ where an even pace would be by today. */
export const GOAL_PACE = { onPace: 0.95, slightlyBehind: 0.8 } as const;

export type GoalState = 'achieved' | 'ahead' | 'on-pace' | 'slightly-behind' | 'behind';

export const GOAL_STATE_LOOK: Record<GoalState, { status: LoadStatus; label: string }> = {
  achieved: { status: 'good', label: 'Achieved' },
  ahead: { status: 'good', label: 'Ahead of pace' },
  'on-pace': { status: 'good', label: 'On pace' },
  'slightly-behind': { status: 'warning', label: 'Slightly behind' },
  behind: { status: 'serious', label: 'Behind' },
};

export interface GoalProgress {
  start: string;
  end: string;
  current: number;
  target: number;
  /** current ÷ target (may exceed 1). */
  fraction: number;
  /** Where an even pace through the period would be by the end of today. */
  expected: number;
  daysElapsed: number;
  daysTotal: number;
  /** At the current rate, the total by the end of the period. */
  projected: number;
  /** Still needed per remaining week to reach the target (0 once achieved; null on the last day). */
  neededPerWeek: number | null;
  state: GoalState;
  /** Running total at the end of each day so far, for a pace chart. */
  cumulative: Array<{ date: string; value: number }>;
}

/**
 * Progress toward a goal in the period containing `today`, from the rides in it. Today counts as
 * elapsed, so riding today never makes you "behind" for it.
 */
export function goalProgress(rides: readonly VolumeInput[], goal: GoalInput, today: string): GoalProgress {
  const { start, end } = periodBounds(goal.period, today);
  const daysTotal = daysBetween(start, end) + 1;
  const daysElapsed = Math.min(daysTotal, daysBetween(start, today) + 1);
  const perDay = new Map<string, number>();
  for (const r of rides) {
    if (r.date < start || r.date > today) continue;
    perDay.set(r.date, (perDay.get(r.date) ?? 0) + goalValue(r, goal.metric));
  }
  const cumulative: GoalProgress['cumulative'] = [];
  let current = 0;
  for (let i = 0; i < daysElapsed; i++) {
    const date = addDays(start, i);
    current += perDay.get(date) ?? 0;
    cumulative.push({ date, value: current });
  }
  const expected = (goal.target * daysElapsed) / daysTotal;
  const daysLeft = daysTotal - daysElapsed;
  const ratio = expected > 0 ? current / expected : 1;
  const state: GoalState =
    current >= goal.target
      ? 'achieved'
      : ratio >= 1
        ? 'ahead'
        : ratio >= GOAL_PACE.onPace
          ? 'on-pace'
          : ratio >= GOAL_PACE.slightlyBehind
            ? 'slightly-behind'
            : 'behind';
  return {
    start,
    end,
    current,
    target: goal.target,
    fraction: goal.target > 0 ? current / goal.target : 0,
    expected,
    daysElapsed,
    daysTotal,
    projected: (current / daysElapsed) * daysTotal,
    neededPerWeek: current >= goal.target ? 0 : daysLeft > 0 ? ((goal.target - current) / daysLeft) * 7 : null,
    state,
    cumulative,
  };
}
