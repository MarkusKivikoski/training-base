import type { ActivitySummary, MergedPart } from '@app/shared';
import type { FitLap, FitSample } from '../fit/parseFit.js';

/** One recording's decoded FIT data. */
export interface Recording {
  samples: readonly FitSample[];
  laps: readonly FitLap[];
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/** The sum, or null when any part lacks the value: a partial sum would understate the ride. */
const sumOrNull = (values: ReadonlyArray<number | null>): number | null => {
  if (values.some((value) => value === null)) return null;
  return sum(values as number[]);
};

const maxOrNull = (values: ReadonlyArray<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : Math.max(...present);
};

/** Average of the parts that have the value, weighted by their riding time. */
const weightedAverage = (values: ReadonlyArray<number | null>, weights: readonly number[]): number | null => {
  let weightedTotal = 0;
  let totalWeight = 0;
  values.forEach((value, i) => {
    if (value === null) return;
    weightedTotal += value * weights[i]!;
    totalWeight += weights[i]!;
  });
  return totalWeight > 0 ? weightedTotal / totalWeight : null;
};

const round = (value: number | null, digits: number) => {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const startMs = (summary: Pick<ActivitySummary, 'startTimeUtc'>) => Date.parse(summary.startTimeUtc);

/** Each recording's place in the joined ride: seconds after the first one started, and its length. */
export function mergedParts(parts: ReadonlyArray<Pick<ActivitySummary, 'id' | 'startTimeUtc' | 'durationS'>>) {
  const first = parts[0]!;
  return parts.map((part): MergedPart => ({
    id: part.id,
    startS: Math.round((startMs(part) - startMs(first)) / 1000),
    durationS: part.durationS,
  }));
}

/**
 * One ride from the Garmin summaries of its recordings, earliest first. Identity, sport and start
 * come from the first; totals are summed (time between the recordings isn't counted, as nothing
 * was recorded), maxima kept and averages weighted by riding time. Metrics computed from streams
 * are left empty: they come from the joined stream afterwards.
 */
export function mergeSummaries(parts: readonly ActivitySummary[]): ActivitySummary {
  if (parts.length < 2) throw new Error('A merged ride needs at least two recordings');
  const first = parts[0]!;
  const ridingTimes = parts.map((part) => part.movingDurationS ?? part.durationS);
  const distanceM = sumOrNull(parts.map((part) => part.distanceM));
  const movingDurationS = sumOrNull(parts.map((part) => part.movingDurationS));
  const hasSpeedFromTotals = distanceM !== null && movingDurationS !== null && movingDurationS > 0;
  const avgSpeedMps = hasSpeedFromTotals
    ? distanceM / movingDurationS
    : weightedAverage(
        parts.map((part) => part.avgSpeedMps),
        ridingTimes,
      );

  return {
    ...first,
    durationS: sum(parts.map((part) => part.durationS)),
    movingDurationS,
    distanceM,
    elevationGainM: sumOrNull(parts.map((part) => part.elevationGainM)),
    avgSpeedMps: round(avgSpeedMps, 3),
    maxSpeedMps: maxOrNull(parts.map((part) => part.maxSpeedMps)),
    avgHr: round(
      weightedAverage(
        parts.map((part) => part.avgHr),
        ridingTimes,
      ),
      1,
    ),
    maxHr: maxOrNull(parts.map((part) => part.maxHr)),
    avgCadence: round(
      weightedAverage(
        parts.map((part) => part.avgCadence),
        ridingTimes,
      ),
      1,
    ),
    maxCadence: maxOrNull(parts.map((part) => part.maxCadence)),
    avgPower: round(
      weightedAverage(
        parts.map((part) => part.avgPower),
        ridingTimes,
      ),
      1,
    ),
    maxPower: maxOrNull(parts.map((part) => part.maxPower)),
    activeCalories: sumOrNull(parts.map((part) => part.activeCalories)),
    hasPower: parts.some((part) => part.hasPower),
    mergedFrom: mergedParts(parts),
  };
}

/**
 * The records and laps of several recordings as one. Timestamps are absolute, so the recordings
 * line up as they were ridden; each device's cumulative distance restarts at zero, so a later
 * recording's distance continues from where the earlier ones ended.
 */
export function joinRecordings(recordings: readonly Recording[]): Recording {
  const samples: FitSample[] = [];
  const laps: FitLap[] = [];
  let distanceBefore = 0;

  for (const recording of recordings) {
    let lastDistance = 0;
    for (const sample of recording.samples) {
      if (sample.distance !== null) lastDistance = Math.max(lastDistance, sample.distance);
      const distance = sample.distance === null ? null : sample.distance + distanceBefore;
      samples.push({ ...sample, distance });
    }
    laps.push(...recording.laps);
    distanceBefore += lastDistance;
  }
  return { samples, laps };
}
