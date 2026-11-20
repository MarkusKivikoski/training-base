/** Power and heart rate of one effort on a repeated workout or route. */
export interface EffortOutput {
  power: number | null;
  hr: number | null;
}

export interface EffortChange {
  /** How many earlier efforts the comparison is against. */
  againstCount: number;
  /** Power against the earlier efforts' median, %. */
  powerPct: number;
  /** Heart rate against the earlier efforts' median, bpm. */
  hrBpm: number;
  /** Power per heartbeat against the earlier efforts' median, %. Positive: more power for each beat. */
  efficiencyPct: number;
}

/** An effort is compared with at most this many of the efforts before it. */
export const EFFORT_CHANGE_WINDOW = 5;

/** A change in power per heartbeat smaller than this is day-to-day noise, %. */
export const EFFICIENCY_NOTICEABLE_PCT = 2;

export type EfficiencyTrend = 'up' | 'same' | 'down';

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const hasBoth = (effort: EffortOutput): effort is { power: number; hr: number } =>
  effort.power !== null && effort.power > 0 && effort.hr !== null && effort.hr > 0;

/**
 * How an effort compares with the ones before it: against the median power, heart rate and power
 * per heartbeat of the last `window` earlier efforts that have both. `earlier` is oldest first.
 * Null for a first effort, or when the effort has no power or heart rate.
 */
export function effortChange(
  current: EffortOutput,
  earlier: readonly EffortOutput[],
  window = EFFORT_CHANGE_WINDOW,
): EffortChange | null {
  if (!hasBoth(current)) return null;
  const comparable = earlier.filter(hasBoth).slice(-window);
  if (comparable.length === 0) return null;

  const basePower = median(comparable.map((effort) => effort.power));
  const baseHr = median(comparable.map((effort) => effort.hr));
  const baseEfficiency = median(comparable.map((effort) => effort.power / effort.hr));
  const efficiency = current.power / current.hr;

  return {
    againstCount: comparable.length,
    powerPct: (current.power / basePower - 1) * 100,
    hrBpm: current.hr - baseHr,
    efficiencyPct: (efficiency / baseEfficiency - 1) * 100,
  };
}

/** Whether power per heartbeat went up, down, or stayed within day-to-day noise. */
export function efficiencyTrend(efficiencyPct: number): EfficiencyTrend {
  if (efficiencyPct >= EFFICIENCY_NOTICEABLE_PCT) return 'up';
  if (efficiencyPct <= -EFFICIENCY_NOTICEABLE_PCT) return 'down';
  return 'same';
}

/** Speed and heart rate of one effort on a repeated route. */
export interface RouteEffortOutput {
  /** Average moving speed, m/s. */
  speed: number | null;
  hr: number | null;
}

export interface SpeedChange {
  /** How many earlier efforts the comparison is against. */
  againstCount: number;
  /** Speed against the earlier efforts' median, %. */
  speedPct: number;
  /** Heart rate against the median of the same efforts, bpm; null when this or all of those lack it. */
  hrBpm: number | null;
}

/** A change in speed smaller than this is day-to-day noise (wind, traffic lights), %. */
export const SPEED_NOTICEABLE_PCT = 2;

export type SpeedTrend = 'faster' | 'same' | 'slower';

const hasSpeed = (effort: RouteEffortOutput): effort is { speed: number; hr: number | null } =>
  effort.speed !== null && effort.speed > 0;

/**
 * How an effort on a route compares with the ones before it: against the median speed (and heart
 * rate, where recorded) of the last `window` earlier efforts. `earlier` is oldest first. Null for
 * a first effort, or without a speed.
 */
export function speedChange(
  current: RouteEffortOutput,
  earlier: readonly RouteEffortOutput[],
  window = EFFORT_CHANGE_WINDOW,
): SpeedChange | null {
  if (!hasSpeed(current)) return null;
  const comparable = earlier.filter(hasSpeed).slice(-window);
  if (comparable.length === 0) return null;

  const baseSpeed = median(comparable.map((effort) => effort.speed));
  const earlierHeartRates: number[] = [];
  for (const effort of comparable) {
    if (effort.hr !== null && effort.hr > 0) earlierHeartRates.push(effort.hr);
  }
  const hasHeartRates = current.hr !== null && current.hr > 0 && earlierHeartRates.length > 0;

  return {
    againstCount: comparable.length,
    speedPct: (current.speed / baseSpeed - 1) * 100,
    hrBpm: hasHeartRates ? current.hr! - median(earlierHeartRates) : null,
  };
}

/** Whether an effort was faster or slower than before, or within day-to-day noise. */
export function speedTrend(speedPct: number): SpeedTrend {
  if (speedPct >= SPEED_NOTICEABLE_PCT) return 'faster';
  if (speedPct <= -SPEED_NOTICEABLE_PCT) return 'slower';
  return 'same';
}
