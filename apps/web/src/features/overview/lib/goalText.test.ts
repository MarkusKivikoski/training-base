import type { GoalProgress } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import type { Goal } from '@/shared/api/client';
import { describeGoalNeed, describeGoalPace, formatGoalAmount, goalLabel } from './goalText';

const goal = (o: Partial<Goal> = {}): Goal => ({ id: 'g', metric: 'distance', period: 'year', target: 3000, ...o });
const progress = (o: Partial<GoalProgress> = {}): GoalProgress => ({
  start: '2026-01-01',
  end: '2026-12-31',
  current: 2451,
  target: 3000,
  fraction: 0.82,
  expected: 2565,
  daysElapsed: 313,
  daysTotal: 365,
  projected: 2867,
  neededPerWeek: 73.9,
  state: 'on-pace',
  cumulative: [],
  ...o,
});

describe('goal text', () => {
  it('formats amounts per metric', () => {
    expect(formatGoalAmount(1842, 'distance')).toBe('1,842 km');
    expect(formatGoalAmount(5.46, 'time')).toBe('5.5 h');
    expect(formatGoalAmount(1, 'rides')).toBe('1 ride');
    expect(goalLabel(goal())).toBe('3,000 km per year');
  });

  it('describes what is still needed', () => {
    expect(describeGoalNeed(goal(), progress())).toBe('Need 74 km/week from here');
    expect(describeGoalNeed(goal({ period: 'week' }), progress({ daysElapsed: 365 }))).toBe(
      '549 km to go by the end of today',
    );
    expect(describeGoalNeed(goal({ period: 'week' }), progress({ daysElapsed: 362 }))).toBe(
      '549 km to go, 3 days left',
    );
    expect(describeGoalNeed(goal(), progress({ state: 'achieved', daysElapsed: 360 }))).toBe(
      'Done with 5 days to spare',
    );
  });

  it('describes the gap to an even pace', () => {
    expect(describeGoalPace(goal(), progress())).toBe('−114 km vs pace');
    expect(describeGoalPace(goal(), progress({ current: 2600 }))).toBe('+35 km vs pace');
  });
});
