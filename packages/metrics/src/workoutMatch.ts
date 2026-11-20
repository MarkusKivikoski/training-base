import { perSecond, rangeStats, type StreamLike, type TimeRange } from './intervals.js';

/**
 * When two indoor rides count as the same workout. The trainer rides carry no workout name or
 * steps (recorded on a head unit, one lap), so the power trace itself is compared.
 *
 * Checked against the 12 powered trainer rides on 2026-11-16: the one repeated workout differs
 * by 4 %, the closest pair of different rides by 11 % (and by 19 % in length).
 */
export const WORKOUT_MATCH_RULES = {
  /** Length of one profile bin, seconds. */
  binS: 10,
  /** Bins averaged around each one, so single spikes and step edges weigh less. */
  smoothBins: 3,
  /** The head unit is started by hand, so one ride's workout may begin this much earlier or later. */
  maxOffsetS: 180,
  /** Rides must overlap at least this long once aligned, seconds. */
  minOverlapS: 600,
  /** Rides whose lengths differ by more than this share of the reference are different workouts. */
  maxDurationDifference: 0.1,
  /** The same workout at another FTP: the other ride's power may be scaled by a factor in this range. */
  minScale: 0.87,
  maxScale: 1.15,
  /** Largest mean absolute difference between the aligned profiles, as a share of the reference's mean power. */
  maxDifference: 0.08,
} as const;

export type WorkoutMatchRules = { [K in keyof typeof WORKOUT_MATCH_RULES]: number };

/** Seconds of heart rate at the end of a work block that give its end heart rate. */
const END_HR_WINDOW_S = 30;

const average = (values: readonly number[]): number => {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
};

/**
 * A ride's power as one smoothed value per `binS` seconds, for comparing workouts. Seconds
 * without a reading (coasting, pauses) count as 0 W. Empty without any power.
 */
export function workoutProfile(
  time: readonly number[],
  power: readonly (number | null)[] | null,
  rules: Partial<WorkoutMatchRules> = {},
): number[] {
  const { binS, smoothBins } = { ...WORKOUT_MATCH_RULES, ...rules };
  if (!power || !power.some((watts) => watts !== null && watts > 0)) return [];

  const watts = perSecond(time, power, { fill: 'zero' }).map((value) => (Number.isNaN(value) ? 0 : value));
  const bins: number[] = [];
  for (let start = 0; start + binS <= watts.length; start += binS) {
    bins.push(average(watts.slice(start, start + binS)));
  }

  const reach = Math.floor(smoothBins / 2);
  return bins.map((_, index) => {
    const from = Math.max(0, index - reach);
    const to = Math.min(bins.length, index + reach + 1);
    return average(bins.slice(from, to));
  });
}

export interface WorkoutAlignment {
  /** Seconds the other ride's workout starts after the reference's (negative: before). */
  offsetS: number;
  /** Factor that best maps the other ride's power onto the reference's, within the allowed range. */
  scale: number;
  /** Mean absolute difference of the aligned, scaled profiles, as a share of the reference's mean power. */
  difference: number;
}

/** The difference between two profiles at one offset (in bins); null when they overlap too little. */
function differenceAt(
  reference: readonly number[],
  other: readonly number[],
  offsetBins: number,
  { binS, minOverlapS, minScale, maxScale }: WorkoutMatchRules,
): { scale: number; difference: number } | null {
  const first = Math.max(0, -offsetBins);
  const last = Math.min(reference.length, other.length - offsetBins);
  const overlapBins = last - first;
  if (overlapBins * binS < minOverlapS) return null;

  let referenceSum = 0;
  let crossSum = 0;
  let otherSquares = 0;
  for (let index = first; index < last; index++) {
    const otherWatts = other[index + offsetBins]!;
    referenceSum += reference[index]!;
    crossSum += reference[index]! * otherWatts;
    otherSquares += otherWatts * otherWatts;
  }
  if (referenceSum <= 0 || otherSquares <= 0) return null;

  // Least-squares factor for other → reference, kept inside the allowed range.
  const scale = Math.min(maxScale, Math.max(minScale, crossSum / otherSquares));
  let absoluteSum = 0;
  for (let index = first; index < last; index++) {
    absoluteSum += Math.abs(reference[index]! - scale * other[index + offsetBins]!);
  }
  return { scale, difference: absoluteSum / referenceSum };
}

/**
 * Lines the other ride's profile up with the reference's: tries every start offset up to
 * `maxOffsetS` either way and keeps the one where the profiles differ least. Null when the rides
 * never overlap long enough.
 */
export function alignWorkouts(
  reference: readonly number[],
  other: readonly number[],
  rules: Partial<WorkoutMatchRules> = {},
): WorkoutAlignment | null {
  const merged = { ...WORKOUT_MATCH_RULES, ...rules };
  const maxOffsetBins = Math.floor(merged.maxOffsetS / merged.binS);

  let best: WorkoutAlignment | null = null;
  for (let offsetBins = -maxOffsetBins; offsetBins <= maxOffsetBins; offsetBins++) {
    const result = differenceAt(reference, other, offsetBins, merged);
    if (!result) continue;
    if (best === null || result.difference < best.difference) {
      best = { offsetS: offsetBins * merged.binS, scale: result.scale, difference: result.difference };
    }
  }
  return best;
}

/** Whether an aligned ride is the same workout as the reference: similar length and a close power profile. */
export function isSameWorkout(
  reference: readonly number[],
  other: readonly number[],
  alignment: WorkoutAlignment | null,
  rules: Partial<WorkoutMatchRules> = {},
): boolean {
  const { maxDurationDifference, maxDifference } = { ...WORKOUT_MATCH_RULES, ...rules };
  if (!alignment || reference.length === 0) return false;
  const durationDifference = Math.abs(other.length - reference.length) / reference.length;
  return durationDifference <= maxDurationDifference && alignment.difference <= maxDifference;
}

export interface WorkoutGroup<T> {
  /** The ride that defines the workout: the first one it was ridden in. */
  reference: T;
  /** Every ride of the workout in input order, the reference first, each aligned to the reference. */
  members: Array<{ ride: T; alignment: WorkoutAlignment }>;
}

const OWN_ALIGNMENT: WorkoutAlignment = { offsetS: 0, scale: 1, difference: 0 };

/** A new group with `ride` as its reference and only member. */
export function newWorkoutGroup<T>(ride: T): WorkoutGroup<T> {
  return { reference: ride, members: [{ ride, alignment: OWN_ALIGNMENT }] };
}

/** The group whose reference `ride` matches most closely, with the alignment; null when it matches none. */
export function closestWorkout<T extends { profile: readonly number[] }>(
  groups: ReadonlyArray<WorkoutGroup<T>>,
  ride: T,
  rules: Partial<WorkoutMatchRules> = {},
): { group: WorkoutGroup<T>; alignment: WorkoutAlignment } | null {
  let closest: { group: WorkoutGroup<T>; alignment: WorkoutAlignment } | null = null;
  for (const group of groups) {
    const alignment = alignWorkouts(group.reference.profile, ride.profile, rules);
    if (!alignment || !isSameWorkout(group.reference.profile, ride.profile, alignment, rules)) continue;
    if (closest === null || alignment.difference < closest.alignment.difference) closest = { group, alignment };
  }
  return closest;
}

export interface GroupWorkoutsOptions<T> {
  rules?: Partial<WorkoutMatchRules>;
  /** Rides that never join another ride's group: each starts its own (others may still join it). */
  isKeptApart?: (ride: T) => boolean;
}

/**
 * Groups rides that are the same workout. Each ride joins the group whose reference it matches
 * most closely, or starts a new group. Order the input oldest first so a workout keeps the
 * reference of the first time it was ridden. Rides without a profile are left out.
 */
export function groupWorkouts<T extends { profile: readonly number[] }>(
  rides: readonly T[],
  { rules = {}, isKeptApart = () => false }: GroupWorkoutsOptions<T> = {},
): Array<WorkoutGroup<T>> {
  const groups: Array<WorkoutGroup<T>> = [];
  for (const ride of rides) {
    if (ride.profile.length === 0) continue;

    const closest = isKeptApart(ride) ? null : closestWorkout(groups, ride, rules);
    if (closest) closest.group.members.push({ ride, alignment: closest.alignment });
    else groups.push(newWorkoutGroup(ride));
  }
  return groups;
}

/**
 * A workout is compared over its work blocks only when they add up to this long, seconds. Below
 * it (a few sprints, one surge on an easy ride) the blocks say little about the ride as a whole.
 */
export const MIN_WORKOUT_WORK_S = 300;

/** The work blocks a workout's efforts are compared over: `blocks`, or none when they are too short in total. */
export function comparableWorkBlocks(blocks: readonly TimeRange[]): TimeRange[] {
  let workSeconds = 0;
  for (const block of blocks) workSeconds += block.endS - block.startS;
  return workSeconds >= MIN_WORKOUT_WORK_S ? [...blocks] : [];
}

export interface WorkBlockStats {
  avgPower: number | null;
  avgHr: number | null;
  /** Average heart rate over the block's last 30 seconds. */
  endHr: number | null;
}

/**
 * One ride's numbers over a work block of its workout. The block is given on the reference
 * ride's clock; `offsetS` moves it onto this ride's. Null when this ride doesn't cover the block.
 */
export function workBlockStats(stream: StreamLike, block: TimeRange, offsetS: number): WorkBlockStats | null {
  const startS = block.startS + offsetS;
  const endS = block.endS + offsetS;
  const lastS = stream.time.at(-1) ?? -1;
  if (startS < 0 || endS > lastS + 1) return null;

  const whole = rangeStats(stream, { startS, endS });
  const end = rangeStats(stream, { startS: Math.max(startS, endS - END_HR_WINDOW_S), endS });
  return { avgPower: whole.avgPower, avgHr: whole.avgHr, endHr: end.avgHr };
}

export interface WorkSummary {
  avgPower: number | null;
  avgHr: number | null;
}

/**
 * Average power and heart rate over the work blocks a ride covered, weighted by block length.
 * `blocks` and `stats` run in parallel; null without any covered block.
 */
export function workSummary(
  blocks: readonly TimeRange[],
  stats: ReadonlyArray<WorkBlockStats | null>,
): WorkSummary | null {
  const weightedAverage = (pick: (block: WorkBlockStats) => number | null): number | null => {
    let weightedSum = 0;
    let seconds = 0;
    blocks.forEach((block, index) => {
      const value = stats[index] ? pick(stats[index]) : null;
      if (value === null) return;
      const durationS = block.endS - block.startS;
      weightedSum += value * durationS;
      seconds += durationS;
    });
    return seconds > 0 ? weightedSum / seconds : null;
  };

  if (!stats.some((block) => block !== null)) return null;
  return { avgPower: weightedAverage((block) => block.avgPower), avgHr: weightedAverage((block) => block.avgHr) };
}
