import { perSecond } from './intervals.js';

/** The first part of a ride is warm-up, when heart rate still lags behind the effort. */
export const DECOUPLING_WARMUP_S = 600;

/** Decoupling needs a long enough ride to mean anything: an hour after the warm-up. */
export const DECOUPLING_MIN_S = 3600;

/** Below this speed (m/s) the rider is stopped; those seconds don't count. */
const MOVING_SPEED_MPS = 1;

export type DecouplingBasis = 'power' | 'speed';

export interface Decoupling {
  /** How much output per heartbeat fell from the first half to the second, %. Negative: it rose. */
  percent: number;
  basis: DecouplingBasis;
  /** Seconds of data compared (after the warm-up). */
  durationS: number;
}

const mean = (values: readonly number[]) => {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
};

/**
 * Aerobic decoupling (Pw:HR with power, Pa:HR with speed): the drop in efficiency (average output
 * ÷ average heart rate) from the first half of the ride to the second, after the warm-up. Uses
 * seconds that have both heart rate and output; with speed, stopped seconds are left out. Gaps
 * up to 30 s are bridged as elsewhere. Null when fewer than DECOUPLING_MIN_S seconds remain.
 */
export function aerobicDecoupling(
  time: readonly number[],
  hr: readonly (number | null)[],
  output: readonly (number | null)[],
  basis: DecouplingBasis,
  { warmupS = DECOUPLING_WARMUP_S, minDurationS = DECOUPLING_MIN_S } = {},
): Decoupling | null {
  const heartRate = perSecond(time, hr, { fill: 'hold' });
  const work = perSecond(time, output, { fill: basis === 'power' ? 'zero' : 'hold' });

  const hrSamples: number[] = [];
  const workSamples: number[] = [];
  for (let t = warmupS; t < heartRate.length; t++) {
    const beat = heartRate[t]!;
    const value = work[t]!;
    const hasBoth = beat > 0 && !Number.isNaN(value);
    const isMoving = basis === 'power' || value >= MOVING_SPEED_MPS;
    if (!hasBoth || !isMoving) continue;
    hrSamples.push(beat);
    workSamples.push(value);
  }
  if (hrSamples.length < minDurationS) return null;

  const half = Math.floor(hrSamples.length / 2);
  const firstEf = mean(workSamples.slice(0, half)) / mean(hrSamples.slice(0, half));
  const secondEf = mean(workSamples.slice(half)) / mean(hrSamples.slice(half));
  if (!(firstEf > 0)) return null;

  const percent = Math.round(((firstEf - secondEf) / firstEf) * 1000) / 10;
  return { percent, basis, durationS: hrSamples.length };
}

/** Power rides count as steady up to this variability index (NP ÷ average power). */
export const MAX_STEADY_VARIABILITY = 1.1;

/** Speed-based rides count as steady up to this much climbing per km, since hills swing speed. */
export const MAX_STEADY_CLIMB_M_PER_KM = 10;

/** Whether a power ride was steady enough for decoupling to mean something. */
export function isSteadyPowerRide(np: number | null, avgPower: number | null): boolean {
  if (np === null || avgPower === null || avgPower <= 0) return false;
  return np / avgPower <= MAX_STEADY_VARIABILITY;
}

/** Whether an outdoor ride was flat enough for speed-based decoupling to mean something. */
export function isSteadySpeedRide(elevationGainM: number | null, distanceM: number | null): boolean {
  if (elevationGainM === null || distanceM === null || distanceM <= 0) return false;
  return elevationGainM / (distanceM / 1000) <= MAX_STEADY_CLIMB_M_PER_KM;
}
