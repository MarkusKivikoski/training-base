import { describe, expect, it } from 'vitest';
import type { ClimbSummary } from '@/shared/api/client';
import { validateClimbsSearch } from '../search';
import { climbLengthText, listedClimbs } from './climbList';
import { historyTimeCap, monthYear, rideCount, sortedEfforts, type ClimbEffort } from './efforts';

const climb = (id: string, o: Partial<ClimbSummary>) =>
  ({
    id,
    rides: 2,
    efforts: 2,
    score: 0,
    lengthM: 500,
    avgGrade: 0.05,
    maxGrade: 0.08,
    lastDate: '2026-01-01',
    ...o,
  }) as ClimbSummary;

const effort = (o: Partial<ClimbEffort>) =>
  ({ activityId: '1', date: '2026-01-01', startS: 0, timeS: 100, rank: 1, ...o }) as ClimbEffort;

describe('climbs search', () => {
  it('keeps only "all"', () => {
    expect(validateClimbsSearch({ show: 'all' })).toEqual({ show: 'all' });
    expect(validateClimbsSearch({ show: 'some' })).toEqual({});
  });
});

describe('climb list', () => {
  const climbs = [
    climb('once', { rides: 1, efforts: 1, maxGrade: 0.2 }),
    climb('steep', { maxGrade: 0.12, lastDate: '2025-06-01' }),
    climb('busy', { rides: 5, efforts: 7, lastDate: '2026-05-01' }),
  ];

  it('shows recurring climbs unless all are asked for', () => {
    expect(listedClimbs(climbs, false, 'rides').map((c) => c.id)).toEqual(['busy', 'steep']);
    expect(listedClimbs(climbs, true, 'maxGrade').map((c) => c.id)).toEqual(['once', 'steep', 'busy']);
    expect(listedClimbs(climbs, true, 'lastDate').map((c) => c.id)).toEqual(['busy', 'once', 'steep']);
  });

  it('breaks ties by efforts and formats length', () => {
    const tied = [climb('a', { efforts: 2 }), climb('b', { efforts: 4 })];
    expect(listedClimbs(tied, true, 'score').map((c) => c.id)).toEqual(['b', 'a']);
    expect(climbLengthText(640)).toBe('640 m');
    expect(climbLengthText(1620)).toBe('1.62 km');
  });
});

describe('efforts', () => {
  it('caps the chart at 2.5× the median, rounded up to 30 s', () => {
    const efforts = [100, 110, 120, 1000].map((timeS) => effort({ timeS }));
    expect(historyTimeCap(efforts)).toBe(300);
    expect(historyTimeCap([effort({ timeS: 100 }), effort({ timeS: 120 })])).toBe(120);
  });

  it('orders efforts and counts rides', () => {
    const efforts = [
      effort({ rank: 2, date: '2026-03-01', startS: 50, activityId: 'x' }),
      effort({ rank: 1, date: '2025-01-01', activityId: 'y' }),
      effort({ rank: 3, date: '2026-03-01', startS: 900, activityId: 'x' }),
    ];
    expect(sortedEfforts(efforts, 'fastest').map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(sortedEfforts(efforts, 'recent').map((e) => e.rank)).toEqual([3, 2, 1]);
    expect(rideCount(efforts)).toBe(2);
  });

  it('labels months', () => {
    expect(monthYear(new Date(2024, 0, 15))).toBe('2024');
    expect(monthYear(new Date(2024, 5, 15))).toBe('6.2024');
  });
});
