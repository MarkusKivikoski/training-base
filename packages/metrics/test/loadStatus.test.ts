import { describe, expect, it } from 'vitest';
import {
  addDays,
  BASELINE_DAYS,
  FATIGUE_ZONES,
  FORM_ZONES,
  loadStatus,
  RAMP_ZONES,
  zoneBands,
  zoneFor,
  type DayLoadInput,
} from '../src/index.js';

/** n days of load starting 2026-01-01, with CTL/ATL/TSB from a function of the day index. */
function series(n: number, f: (i: number) => { ctl: number; atl: number; tsb: number }): DayLoadInput[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays('2026-01-01', i), ...f(i) }));
}

describe('zoneFor', () => {
  it('uses [min, max) boundaries', () => {
    expect(zoneFor(-30, FORM_ZONES).label).toBe('Optimal training');
    expect(zoneFor(-30.01, FORM_ZONES).label).toBe('High risk');
    expect(zoneFor(-10, FORM_ZONES).label).toBe('Neutral');
    expect(zoneFor(5, FORM_ZONES).label).toBe('Fresh');
    expect(zoneFor(20, FORM_ZONES).status).toBe('warning');
    expect(zoneFor(0.79, FATIGUE_ZONES).label).toBe('Undertraining');
    expect(zoneFor(0.8, FATIGUE_ZONES).label).toBe('Optimal');
    expect(zoneFor(1.3, FATIGUE_ZONES).label).toBe('Overreaching');
    expect(zoneFor(1.5, FATIGUE_ZONES).label).toBe('High risk');
    expect(zoneFor(-0.1, RAMP_ZONES).label).toBe('Losing fitness');
    expect(zoneFor(2, RAMP_ZONES).label).toBe('Building');
    expect(zoneFor(7, RAMP_ZONES).label).toBe('Steep build');
    expect(zoneFor(10, RAMP_ZONES).label).toBe('Too steep');
  });
});

describe('loadStatus', () => {
  it('is in the baseline period for the first 42 days (your current data: 12 days in)', () => {
    const days = series(12, (i) => ({ ctl: i, atl: 3 * i, tsb: -19 }));
    days[11] = { date: days[11]!.date, ctl: 10.9, atl: 38.9, tsb: -19.1 };
    const s = loadStatus(days);
    expect(s.form).toEqual({ baseline: true });
    expect(s.fatigue).toEqual({ baseline: true });
    expect(s.baselineUntil).toBe('2026-02-12');
  });

  it('stays in baseline while fitness is below 5, even after 42 days', () => {
    expect(loadStatus(series(60, () => ({ ctl: 4, atl: 4, tsb: 0 }))).fatigue).toEqual({ baseline: true });
  });

  it('classifies fitness ramp, fatigue ratio and form % after the baseline', () => {
    // CTL rising 0.5/day (3.5/week), ATL at 1.2× CTL, TSB at −20 % of yesterday's CTL.
    const days = series(BASELINE_DAYS + 10, (i) => ({
      ctl: 20 + 0.5 * i,
      atl: 1.2 * (20 + 0.5 * i),
      tsb: -0.2 * (20 + 0.5 * (i - 1)),
    }));
    const s = loadStatus(days);
    expect(s.fitness).toMatchObject({ baseline: false, zone: { label: 'Building' } });
    expect(s.fitness.baseline === false && s.fitness.value).toBeCloseTo(3.5, 6);
    expect(s.fatigue).toMatchObject({ baseline: false, zone: { label: 'Optimal' } });
    expect(s.form).toMatchObject({ baseline: false, zone: { label: 'Optimal training' } });
    expect(s.form.baseline === false && s.form.value).toBeCloseTo(-20, 6);
  });
});

describe('zoneBands', () => {
  it('gives absolute edges from CTL after the baseline, null before', () => {
    const days = series(BASELINE_DAYS + 2, () => ({ ctl: 50, atl: 50, tsb: 0 }));
    const bands = zoneBands(days);
    expect(bands[BASELINE_DAYS - 1]).toBeNull();
    expect(bands[BASELINE_DAYS]).toEqual({ fatigueLow: 40, fatigueHigh: 65, formEdges: [-15, -5, 2.5, 10] });
  });
});
