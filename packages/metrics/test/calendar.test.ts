import { describe, expect, it } from 'vitest';
import {
  bandPoints,
  loadCoverage,
  monthGrid,
  shiftMonth,
  weekTotals,
  type CalendarInput,
  type CoverageInput,
} from '../src/index.js';

describe('monthGrid', () => {
  it('covers the month in Monday-first weeks', () => {
    const nov = monthGrid('2026-11'); // 1 Nov 2026 is a Sunday, 30 Nov a Monday
    expect(nov).toHaveLength(6);
    expect(nov[0]![0]).toBe('2026-10-26');
    expect(nov[0]![6]).toBe('2026-11-01');
    expect(nov.at(-1)![0]).toBe('2026-11-30');
    expect(nov.at(-1)![6]).toBe('2026-12-06');
    expect(nov.every((w) => w.length === 7)).toBe(true);
  });

  it('handles a month that starts on Monday and ends on Sunday (4 weeks)', () => {
    const feb = monthGrid('2027-02'); // 1 Feb 2027 is a Monday, 28 Feb a Sunday
    expect(feb).toHaveLength(4);
    expect(feb[0]![0]).toBe('2027-02-01');
    expect(feb.at(-1)![6]).toBe('2027-02-28');
  });

  it('crosses the year boundary', () => {
    const dec = monthGrid('2026-12');
    expect(dec[0]![0]).toBe('2026-11-30');
    expect(dec.at(-1)![6]).toBe('2027-01-03');
  });
});

describe('shiftMonth', () => {
  it('moves across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });
});

describe('weekTotals', () => {
  const a = (o: Partial<CalendarInput>): CalendarInput => ({
    date: '2026-11-02',
    durationS: 4000,
    movingDurationS: 3600,
    distanceM: 30000,
    elevationGainM: 100,
    isIndoor: false,
    sport: 'cycling',
    isCycling: true,
    load: null,
    ...o,
  });

  it('sums rides only, with outdoor distance only, and TSS where present', () => {
    expect(
      weekTotals([
        a({ load: { tss: 60 } }),
        a({ isIndoor: true, distanceM: 25000, load: { tss: 40 } }),
        a({ sport: 'running', isCycling: false, durationS: 2700, movingDurationS: null, distanceM: null }),
        a({ sport: 'strength_training', isCycling: false }),
        a({ sport: 'strength_training', isCycling: false }),
      ]),
    ).toEqual({
      movingS: 7200,
      outdoorDistanceM: 30000,
      rides: 2,
      tss: 100,
      outdoorElevationM: 100,
      gymSessions: 2,
      otherActivities: 1,
    });
  });

  it('is zero for an empty week', () => {
    expect(weekTotals([])).toEqual({
      movingS: 0,
      outdoorDistanceM: 0,
      rides: 0,
      tss: 0,
      outdoorElevationM: 0,
      gymSessions: 0,
      otherActivities: 0,
    });
  });
});

describe('bandPoints', () => {
  it('averages edges with neighbours, including across week rows', () => {
    const w1 = bandPoints([0, 10, 20, 30, 40, 50, 60], null, 80);
    const w2 = bandPoints([80, 70, null, null, null, null, null], 60, null);
    expect(w1[1]).toEqual({ left: 5, center: 10, right: 15 });
    expect(w1[0]!.left).toBe(0); // nothing before: flat edge
    expect(w1[6]!.right).toBe(70);
    expect(w2[0]!.left).toBe(70); // continuous with the previous row
  });

  it('leaves days without data empty and keeps a flat edge next to them', () => {
    const w = bandPoints([null, 10, 20, null, null, null, null], null, null);
    expect(w[0]).toBeNull();
    expect(w[1]).toEqual({ left: 10, center: 10, right: 15 });
    expect(w[2]).toEqual({ left: 15, center: 20, right: 20 });
    expect(w[3]).toBeNull();
  });
});

describe('loadCoverage', () => {
  const ride = (o: Partial<CoverageInput>): CoverageInput => ({
    date: '2026-10-05',
    durationS: 3600,
    movingDurationS: 3000,
    distanceM: 20000,
    elevationGainM: 100,
    isIndoor: false,
    isCycling: true,
    hasPower: false,
    load: null,
    ...o,
  });

  it('splits TSS by source and counts rides without any', () => {
    const coverage = loadCoverage([
      ride({ hasPower: true, load: { tss: 80, source: 'power' } }),
      ride({ hasPower: true, load: { tss: 70, source: 'power' } }),
      ride({ load: { tss: 50, source: 'hr' } }),
      ride({}),
      ride({ isCycling: false, load: { tss: 30, source: 'hr' } }),
    ]);
    expect(coverage).toEqual({
      rides: 4,
      rideS: 12000,
      poweredRides: 2,
      poweredS: 6000,
      powerTss: 150,
      powerTssRides: 2,
      hrTss: 50,
      hrTssRides: 1,
      noLoadRides: 1,
    });
  });

  it('counts a powered ride without power TSS (no FTP yet) as powered but by its HR load', () => {
    const coverage = loadCoverage([ride({ hasPower: true, load: { tss: 40, source: 'hr' } })]);
    expect(coverage.poweredRides).toBe(1);
    expect(coverage.hrTssRides).toBe(1);
  });
});
