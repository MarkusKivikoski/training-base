import { describe, expect, it } from 'vitest';
import { monthlyRidingS, yearTotals, type ReviewInput } from '../src/index.js';

const a = (date: string, o: Partial<ReviewInput> = {}): ReviewInput => ({
  date,
  durationS: 4000,
  movingDurationS: 3600,
  distanceM: 30_000,
  elevationGainM: 200,
  isIndoor: false,
  isCycling: true,
  isRunning: false,
  sport: 'cycling',
  ...o,
});

const acts = [
  a('2025-01-05'),
  a('2025-01-05', { isIndoor: true, sport: 'indoor_cycling', elevationGainM: 50 }), // same day: one active day
  a('2025-03-10', { isCycling: false, sport: 'strength_training', distanceM: null }),
  a('2025-06-01', { isCycling: false, isRunning: true, sport: 'running', distanceM: 8000 }),
  a('2025-12-30'),
  a('2026-01-02'), // another year
];

describe('yearTotals', () => {
  it('sums rides, counts gym and other sports, and active days', () => {
    expect(yearTotals(acts, 2025)).toEqual({
      rides: 3,
      indoorRides: 1,
      outdoorRides: 2,
      movingS: 3 * 3600,
      distanceM: 90_000,
      elevationM: 400, // indoor elevation doesn't count
      gym: 1,
      activeDays: 4,
      others: { running: 1, strength: 1, skiing: 0, other: 0 },
    });
  });

  it('can stop at a day of the year, for comparing with a year in progress', () => {
    expect(yearTotals(acts, 2025, { untilMonthDay: '03-10' })).toMatchObject({ rides: 2, gym: 1, activeDays: 2 });
  });

  it('sums runs instead of rides for running, with the same gym, active-day and other-sport counts', () => {
    expect(yearTotals(acts, 2025, { discipline: 'running' })).toEqual({
      rides: 1,
      indoorRides: 0,
      outdoorRides: 1,
      movingS: 3600,
      distanceM: 8000,
      elevationM: 200,
      gym: 1,
      activeDays: 4,
      others: { running: 1, strength: 1, skiing: 0, other: 0 },
    });
  });
});

describe('monthlyRidingS', () => {
  it('puts riding time in its month, rides only', () => {
    const m = monthlyRidingS(acts, 2025);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe(7200);
    expect(m[2]).toBe(0); // strength
    expect(m[11]).toBe(3600);
  });

  it('can sum runs instead', () => {
    const m = monthlyRidingS(acts, 2025, 'running');
    expect(m[0]).toBe(0);
    expect(m[5]).toBe(3600);
  });
});
