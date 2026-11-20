import { describe, expect, it } from 'vitest';
import { powerProfile, riderType, weightOnDate } from '../src/index.js';

const curve = (w5: number, w60: number, w300: number, w1200: number, date = '2026-10-27') =>
  [
    [5, w5],
    [60, w60],
    [300, w300],
    [1200, w1200],
  ].map(([durationS, watts]) => ({ durationS: durationS!, watts: watts!, date }));

describe('powerProfile', () => {
  it('scores W/kg between the reference ends, with FTP as 95 % of 20 minutes', () => {
    // 80 kg: FTP 0.95 × 300 = 285 W = 3.5625 W/kg.
    const p = powerProfile(curve(1200, 600, 360, 300), () => 80)!;
    const ft = p.points.find((x) => x.key === 'threshold')!;
    expect(ft.watts).toBeCloseTo(285, 9);
    expect(ft.wkg).toBeCloseTo(3.5625, 9);
    expect(ft.score).toBeCloseTo((3.5625 - 1.86) / (6.4 - 1.86), 9);
    expect(p.points.map((x) => x.label)).toEqual(['5 s', '1 min', '5 min', 'FTP']);
  });

  it('uses the weight on each effort date and needs all four durations and a weight', () => {
    const kg = (d: string) => (d < '2026-06-01' ? 90 : 80);
    const old = powerProfile(curve(1200, 600, 360, 300, '2026-01-01'), kg)!;
    expect(old.points[0]!.wkg).toBeCloseTo(1200 / 90, 9);
    expect(powerProfile(curve(1200, 600, 360, 300).slice(0, 3), () => 80)).toBeNull();
    expect(powerProfile(curve(1200, 600, 360, 300), () => null)).toBeNull();
  });
});

describe('riderType', () => {
  it('reads the shape of the scores', () => {
    expect(riderType([0.5, 0.52, 0.48, 0.5])).toBe('all-rounder');
    expect(riderType([0.8, 0.7, 0.5, 0.4])).toBe('sprinter');
    expect(riderType([0.3, 0.35, 0.55, 0.6])).toBe('time-trialist');
    expect(riderType([0.4, 0.5, 0.7, 0.5])).toBe('pursuiter');
  });
});

describe('weightOnDate', () => {
  it('takes the entry in effect, or the earliest one before any entry', () => {
    const w = [
      { from: '2026-11-04', kg: 85 },
      { from: '2026-11-06', kg: 84.5 },
    ];
    expect(weightOnDate(w, '2026-11-05')).toBe(85);
    expect(weightOnDate(w, '2026-12-01')).toBe(84.5);
    expect(weightOnDate(w, '2026-10-27')).toBe(85);
    expect(weightOnDate([], '2026-10-27')).toBeNull();
  });
});
