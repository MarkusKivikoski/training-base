/** Friel's guide: under 5% decoupling means good aerobic endurance for that effort. */
export const WELL_COUPLED_MAX_PERCENT = 5;

export type DecouplingBasis = 'power' | 'speed';

/** "3.2%", "−1.4%". */
export const formatDecoupling = (percent: number): string =>
  `${percent < 0 ? '−' : ''}${Math.abs(percent).toFixed(1)}%`;

/** "power vs heart rate". */
export const decouplingBasisLabel = (basis: DecouplingBasis): string =>
  basis === 'power' ? 'power vs heart rate' : 'speed vs heart rate';

/** A short reading of the value. */
export const decouplingVerdict = (percent: number): string =>
  percent < WELL_COUPLED_MAX_PERCENT ? 'well coupled' : 'heart rate drifted';

/** The explanation shown next to the value. */
export const DECOUPLING_EXPLANATION =
  'Aerobic decoupling compares the first and second half of the ride (after a 10-minute warm-up): how much less power, or speed on rides without power, you got per heartbeat later on. Under 5% on a long steady ride means good aerobic endurance; more means heart rate drifted up (fatigue, heat, too little fuel or water). It only means something on steady rides; intervals, hills and wind make it jump.';
