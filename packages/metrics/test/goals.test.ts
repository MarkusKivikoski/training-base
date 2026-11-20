import { describe, expect, it } from 'vitest';
import { goalProgress, goalValue, periodBounds, type VolumeInput } from '../src/index.js';

const ride = (date: string, km: number, o: Partial<VolumeInput> = {}): VolumeInput => ({
  date,
  durationS: 3600,
  movingDurationS: 3000,
  distanceM: km * 1000,
  elevationGainM: 100,
  isIndoor: false,
  ...o,
});

describe('periodBounds', () => {
  it('gives ISO weeks, calendar months (leap years too) and years', () => {
    expect(periodBounds('week', '2026-11-08')).toEqual({ start: '2026-11-02', end: '2026-11-08' }); // Sunday
    expect(periodBounds('month', '2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(periodBounds('month', '2026-12-31')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
    expect(periodBounds('year', '2026-11-08')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('goalValue', () => {
  it('converts to the goal units, using moving time', () => {
    const r = ride('2026-01-01', 42.5);
    expect(goalValue(r, 'distance')).toBe(42.5);
    expect(goalValue(r, 'time')).toBeCloseTo(3000 / 3600, 9);
    expect(goalValue(r, 'elevation')).toBe(100);
    expect(goalValue(r, 'rides')).toBe(1);
  });
});

describe('goalProgress', () => {
  it('compares the total so far with an even pace, counting today as elapsed', () => {
    // 3,650 km in a 365-day year: 10 km/day. By 10 January (10 days) the pace is 100 km.
    const p = goalProgress(
      [ride('2026-01-03', 60), ride('2026-01-10', 50), ride('2025-12-31', 500), ride('2026-01-11', 70)],
      { metric: 'distance', period: 'year', target: 3650 },
      '2026-01-10',
    );
    expect(p).toMatchObject({
      start: '2026-01-01',
      end: '2026-12-31',
      current: 110,
      daysElapsed: 10,
      daysTotal: 365,
      state: 'ahead',
    });
    expect(p.expected).toBeCloseTo(100, 9);
    expect(p.projected).toBeCloseTo(11 * 365, 9);
    expect(p.neededPerWeek).toBeCloseTo(((3650 - 110) / 355) * 7, 9);
    expect(p.cumulative).toHaveLength(10);
    expect(p.cumulative[2]).toEqual({ date: '2026-01-03', value: 60 });
    expect(p.cumulative.at(-1)!.value).toBe(110);
  });

  it('labels pace: on pace, slightly behind, behind and achieved', () => {
    const week = (km: number, today = '2026-11-04') =>
      goalProgress([ride('2026-11-02', km)], { metric: 'distance', period: 'week', target: 70 }, today).state;
    // Wednesday: 3 of 7 days, pace 30 km.
    expect(week(29)).toBe('on-pace');
    expect(week(25)).toBe('slightly-behind');
    expect(week(10)).toBe('behind');
    expect(week(70)).toBe('achieved');
  });

  it('needs nothing more once achieved and has no weekly need on the last day', () => {
    expect(
      goalProgress([ride('2026-11-02', 80)], { metric: 'distance', period: 'week', target: 70 }, '2026-11-04')
        .neededPerWeek,
    ).toBe(0);
    expect(
      goalProgress([ride('2026-11-02', 10)], { metric: 'rides', period: 'week', target: 3 }, '2026-11-08')
        .neededPerWeek,
    ).toBeNull();
  });
});
