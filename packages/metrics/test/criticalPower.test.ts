import { describe, expect, it } from 'vitest';
import { criticalPower, powerFromModel } from '../src/index.js';

/** Best efforts that follow the model exactly: CP 250 W, W′ 20 kJ. */
const exact = [60, 120, 300, 600, 1200].map((durationS) => ({ durationS, watts: 250 + 20000 / durationS }));

describe('criticalPower', () => {
  it('recovers CP and W′ from efforts that follow the model', () => {
    const model = criticalPower(exact)!;
    expect(model.cp).toBeCloseTo(250, 6);
    expect(model.wPrimeJ).toBeCloseTo(20000, 3);
    expect(model.rSquared).toBeCloseTo(1, 9);
    // Only the 2–20 minute bests are used.
    expect(model.durationsS).toEqual([120, 300, 600, 1200]);
  });

  it('works from three durations and reports a lower R² for a ragged curve', () => {
    const ragged = [
      { durationS: 120, watts: 400 },
      { durationS: 300, watts: 290 },
      { durationS: 1200, watts: 250 },
    ];
    const model = criticalPower(ragged)!;
    expect(model.durationsS).toEqual([120, 300, 1200]);
    expect(model.cp).toBeGreaterThan(230);
    expect(model.cp).toBeLessThan(250);
    expect(model.rSquared).toBeLessThan(1);
  });

  it('needs at least three durations and a physical fit', () => {
    expect(criticalPower(exact.filter((p) => p.durationS <= 300))).toBeNull();
    // Power rising with duration gives a negative W′.
    expect(
      criticalPower([
        { durationS: 120, watts: 200 },
        { durationS: 300, watts: 250 },
        { durationS: 600, watts: 300 },
      ]),
    ).toBeNull();
  });

  it('gives the model power for a duration', () => {
    expect(powerFromModel({ cp: 250, wPrimeJ: 20000 }, 400)).toBe(300);
  });
});
