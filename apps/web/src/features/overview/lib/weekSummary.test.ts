import type { WeekVolume } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { summariseWeeks } from './weekSummary';

const week = (weekStart: string, indoorH: number, outdoorH: number, count = 1): WeekVolume => ({
  weekStart,
  indoorDurationS: indoorH * 3600,
  outdoorDurationS: outdoorH * 3600,
  distanceM: count * 30_000,
  elevationGainM: 0,
  count,
});

describe('summariseWeeks', () => {
  it('reports the current week and the average of the four weeks before it', () => {
    const weeks = [
      week('2026-09-28', 9, 0), // five weeks back: not counted
      week('2026-10-05', 1, 1),
      week('2026-10-12', 2, 0),
      week('2026-10-19', 0, 4),
      week('2026-10-26', 2, 2),
      week('2026-11-02', 1, 2, 3),
    ];
    expect(summariseWeeks(weeks)).toEqual({
      thisWeekS: 3 * 3600,
      thisWeekRides: 3,
      thisWeekDistanceM: 90_000,
      previousFourAverageS: 3 * 3600,
    });
  });

  it('is all zeros without data', () => {
    expect(summariseWeeks([])).toEqual({
      thisWeekS: 0,
      thisWeekRides: 0,
      thisWeekDistanceM: 0,
      previousFourAverageS: 0,
    });
  });
});
