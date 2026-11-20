import { describe, expect, it } from 'vitest';
import {
  classifyWorkout,
  HR_ZONES,
  hrSegments,
  normalizedPower,
  POWER_ZONES,
  powerSegments,
  timeInZones,
  workIntervalsOf,
  type WorkoutTypeInput,
} from '../src/index.js';

const FTP = 250;
const LTHR = 165;

/** `seconds` of steady power at `share` of FTP. */
const steady = (seconds: number, share: number): number[] => Array(seconds).fill(Math.round(share * FTP));

/** `count` repetitions of work then recovery. */
const repeats = (count: number, work: number[], recovery: number[]): number[] =>
  Array.from({ length: count }, () => [...work, ...recovery]).flat();

/** A workout with a 15-minute warm-up and a 10-minute cool-down around the main set. */
const session = (mainSet: number[]): number[] => [...steady(900, 0.55), ...mainSet, ...steady(600, 0.5)];

/** The classifier's input for a 1 Hz power-only ride, as the rebuild builds it. */
const powerRide = (watts: number[], { isIndoor = true } = {}): WorkoutTypeInput => {
  const time = watts.map((_, second) => second);
  const segments = powerSegments(time, watts);
  return {
    isIndoor,
    powerZoneSeconds: timeInZones(segments, FTP, POWER_ZONES),
    intensityFactor: normalizedPower(segments)! / FTP,
    workIntervals: workIntervalsOf(time, watts, FTP),
    hrZoneSeconds: null,
  };
};

/** The classifier's input for a 1 Hz ride with heart rate only. */
const hrRide = (bpm: number[]): WorkoutTypeInput => {
  const time = bpm.map((_, second) => second);
  return {
    isIndoor: false,
    powerZoneSeconds: null,
    intensityFactor: null,
    workIntervals: [],
    hrZoneSeconds: timeInZones(hrSegments(time, bpm), LTHR, HR_ZONES),
  };
};

const steadyHr = (seconds: number, share: number): number[] => Array(seconds).fill(Math.round(share * LTHR));

describe('classifyWorkout with power', () => {
  it('reads 2 × 20 min at 97 % as threshold, with its repetitions', () => {
    const result = classifyWorkout(powerRide(session(repeats(2, steady(1200, 0.97), steady(300, 0.5)))));
    expect(result?.type).toBe('threshold');
    expect(result?.basis).toBe('power');
    expect(result?.reps?.count).toBe(2);
    expect(result?.reps?.durationS).toBeGreaterThan(1150);
    expect(result?.reps?.intensity).toBeCloseTo(0.97, 1);
  });

  it('reads 3 × 15 min at 90 % as sweet spot', () => {
    const result = classifyWorkout(powerRide(session(repeats(3, steady(900, 0.9), steady(300, 0.5)))));
    expect(result?.type).toBe('sweetSpot');
  });

  it('reads 5 × 4 min at 115 % as VO₂ max', () => {
    const result = classifyWorkout(powerRide(session(repeats(5, steady(240, 1.15), steady(240, 0.5)))));
    expect(result?.type).toBe('vo2max');
    expect(result?.reps?.count).toBe(5);
  });

  it('reads two sets of 30/30s as VO₂ max, though each set averages under VO₂ max power', () => {
    const set = repeats(10, steady(30, 1.3), steady(30, 0.5));
    const result = classifyWorkout(powerRide(session([...set, ...steady(300, 0.5), ...set])));
    expect(result?.type).toBe('vo2max');
  });

  it('reads 8 × 45 s at 140 % as anaerobic', () => {
    const result = classifyWorkout(powerRide(session(repeats(8, steady(45, 1.4), steady(180, 0.5)))));
    expect(result?.type).toBe('anaerobic');
  });

  it('reads 3 h at 65 % as endurance', () => {
    expect(classifyWorkout(powerRide(steady(3 * 3600, 0.65)))?.type).toBe('endurance');
  });

  it('reads 45 min at 45 % as recovery', () => {
    expect(classifyWorkout(powerRide(steady(45 * 60, 0.45)))?.type).toBe('recovery');
  });

  it('reads 90 min at 82 % as tempo', () => {
    expect(classifyWorkout(powerRide(steady(90 * 60, 0.82)))?.type).toBe('tempo');
  });

  it('reads a ride of irregular hard surges as mixed', () => {
    const surges = [20, 50, 35, 90, 25, 60, 40, 15, 70, 30].flatMap((length) => [
      ...steady(length, 1.35),
      ...steady(120, 0.7),
    ]);
    const watts = [...steady(600, 0.6), ...surges, ...surges, ...surges, ...steady(600, 0.6)];
    expect(classifyWorkout(powerRide(watts, { isIndoor: false }))?.type).toBe('mixed');
  });

  it('keeps a long outdoor ride with a few climbs as endurance', () => {
    const climb = (seconds: number) => steady(seconds, 0.92);
    const watts = [...steady(3600, 0.62), ...climb(360), ...steady(3600, 0.62), ...climb(600), ...steady(3000, 0.62)];
    expect(classifyWorkout(powerRide(watts, { isIndoor: false }))?.type).toBe('endurance');
  });

  it('reads a single 11-minute set of 30/30s as VO₂ max', () => {
    const result = classifyWorkout(powerRide(session(repeats(11, steady(30, 1.5), steady(30, 0.6)))));
    expect(result?.type).toBe('vo2max');
  });

  it('reads a 20-minute test above FTP as threshold', () => {
    const result = classifyWorkout(powerRide(session(steady(1200, 1.06))));
    expect(result?.type).toBe('threshold');
    expect(result?.reps?.count).toBe(1);
  });

  it('keeps an easy ride easy when power spikes inflate its IF', () => {
    const spiky = steady(3600, 0.6);
    for (let second = 60; second < spiky.length; second += 120) spiky.splice(second, 5, ...Array(5).fill(2000));
    const input = powerRide(spiky);
    expect(input.intensityFactor).toBeGreaterThan(0.85);
    expect(classifyWorkout(input)?.type).toBe('endurance');
  });

  it('gives no type to rides under 15 minutes', () => {
    expect(classifyWorkout(powerRide(steady(10 * 60, 0.7)))).toBeNull();
  });
});

describe('classifyWorkout with heart rate only', () => {
  it('gives a rough type from the HR zones', () => {
    expect(classifyWorkout(hrRide(steadyHr(2 * 3600, 0.78)))).toEqual({
      type: 'endurance',
      basis: 'hr',
      reps: null,
    });
    expect(classifyWorkout(hrRide(steadyHr(40 * 60, 0.62)))?.type).toBe('recovery');
    expect(classifyWorkout(hrRide([...steadyHr(1800, 0.8), ...steadyHr(1200, 0.98)]))?.type).toBe('threshold');
    expect(classifyWorkout(hrRide([...steadyHr(3000, 0.8), ...steadyHr(600, 1.08)]))?.type).toBe('mixed');
  });

  it('gives no type without power zones or HR zones', () => {
    expect(
      classifyWorkout({
        isIndoor: true,
        powerZoneSeconds: null,
        intensityFactor: null,
        workIntervals: [],
        hrZoneSeconds: null,
      }),
    ).toBeNull();
  });
});
