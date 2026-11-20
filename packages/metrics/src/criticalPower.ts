/** Durations (s) the critical power model is fitted to: 2 to 20 minutes, where it holds best. */
export const CP_FIT_DURATIONS_S = [120, 300, 600, 1200] as const;

/** At least this many of those durations are needed for a fit. */
const MIN_POINTS = 3;

export interface CriticalPower {
  /** Critical power, W: the power you could sustain for a long time (roughly 30–60 minutes). */
  cp: number;
  /** W′ (W prime), joules: the work above CP you can do before tiring. */
  wPrimeJ: number;
  /** How well the model fits the best efforts (R² of work against time), 0–1. */
  rSquared: number;
  /** The durations used, seconds. */
  durationsS: number[];
}

/**
 * Two-parameter critical power model fitted to best efforts: work done in each effort
 * (power × time) is a straight line against time, W = CP × t + W′. A least-squares line through
 * the 2-, 5-, 10- and 20-minute bests gives CP (the slope) and W′ (the intercept). Null with
 * fewer than three of those durations or a non-physical fit.
 */
export function criticalPower(curve: ReadonlyArray<{ durationS: number; watts: number }>): CriticalPower | null {
  const points = CP_FIT_DURATIONS_S.flatMap((durationS) => {
    const point = curve.find((p) => p.durationS === durationS);
    return point ? [{ t: durationS, work: point.watts * durationS }] : [];
  });
  if (points.length < MIN_POINTS) return null;

  const n = points.length;
  const meanT = points.reduce((sum, p) => sum + p.t, 0) / n;
  const meanWork = points.reduce((sum, p) => sum + p.work, 0) / n;
  let covariance = 0;
  let varianceT = 0;
  let varianceWork = 0;
  for (const p of points) {
    covariance += (p.t - meanT) * (p.work - meanWork);
    varianceT += (p.t - meanT) ** 2;
    varianceWork += (p.work - meanWork) ** 2;
  }

  const cp = covariance / varianceT;
  const wPrimeJ = meanWork - cp * meanT;
  if (!(cp > 0) || !(wPrimeJ > 0)) return null;

  const rSquared = varianceWork > 0 ? covariance ** 2 / (varianceT * varianceWork) : 1;
  return { cp, wPrimeJ, rSquared, durationsS: points.map((p) => p.t) };
}

/** The model's power for a duration: P(t) = CP + W′ / t. */
export function powerFromModel(model: Pick<CriticalPower, 'cp' | 'wPrimeJ'>, durationS: number): number {
  return model.cp + model.wPrimeJ / durationS;
}
