import { describe, expect, it } from 'vitest';
import { aerobicDecoupling, isSteadyPowerRide, isSteadySpeedRide } from '../src/index.js';

const seconds = (count: number) => Array.from({ length: count }, (_, i) => i);
const LENGTH = 600 + 4000;

describe('aerobicDecoupling', () => {
  it('is zero for a perfectly steady ride', () => {
    const result = aerobicDecoupling(seconds(LENGTH), Array(LENGTH).fill(140), Array(LENGTH).fill(200), 'power');
    expect(result).toEqual({ percent: 0, basis: 'power', durationS: 4000 });
  });

  it('measures heart-rate drift at the same power', () => {
    // Same 200 W throughout; heart rate 140 in the first half after warm-up, 147 in the second (+5%).
    const hr = seconds(LENGTH).map((t) => (t < 600 + 2000 ? 140 : 147));
    const result = aerobicDecoupling(seconds(LENGTH), hr, Array(LENGTH).fill(200), 'power');
    // EF falls from 200/140 to 200/147: 4.8% lower.
    expect(result?.percent).toBeCloseTo(4.8, 1);
  });

  it('ignores the warm-up', () => {
    const hr = seconds(LENGTH).map((t) => (t < 600 ? 100 : 140));
    expect(aerobicDecoupling(seconds(LENGTH), hr, Array(LENGTH).fill(200), 'power')?.percent).toBe(0);
  });

  it('leaves out stopped seconds when using speed', () => {
    // A long stop in the second half, with heart rate falling, must not count.
    const speed = seconds(LENGTH).map((t) => (t >= 3000 && t < 3300 ? 0 : 8));
    const hr = seconds(LENGTH).map((t) => (t >= 3000 && t < 3300 ? 90 : 140));
    const result = aerobicDecoupling(seconds(LENGTH), hr, speed, 'speed');
    expect(result).toEqual({ percent: 0, basis: 'speed', durationS: 3700 });
  });

  it('needs an hour of data after the warm-up', () => {
    const short = 600 + 3000;
    expect(aerobicDecoupling(seconds(short), Array(short).fill(140), Array(short).fill(200), 'power')).toBeNull();
  });
});

describe('steady rides', () => {
  it('accepts power rides with a variability index of 1.10 or less', () => {
    expect(isSteadyPowerRide(220, 200)).toBe(true);
    expect(isSteadyPowerRide(221, 200)).toBe(false);
    expect(isSteadyPowerRide(null, 200)).toBe(false);
  });

  it('accepts speed rides with 10 m of climbing per km or less', () => {
    expect(isSteadySpeedRide(400, 40000)).toBe(true);
    expect(isSteadySpeedRide(401, 40000)).toBe(false);
    expect(isSteadySpeedRide(null, 40000)).toBe(false);
  });
});
