import { detectIntervals, perSecond } from './intervals.js';

/** What kind of session a ride was, read from its power (or heart rate) without any labels. */
export const WORKOUT_TYPES = [
  'recovery',
  'endurance',
  'tempo',
  'sweetSpot',
  'threshold',
  'vo2max',
  'anaerobic',
  'mixed',
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

/** Rides shorter than this (riding time) get no type: too little to tell a session apart. */
export const MIN_CLASSIFIED_S = 15 * 60;

/** Seconds at or above this share of FTP count as bursts (Coggan anaerobic, Z6 and up). */
const BURST_INTENSITY = 1.2;
/**
 * A block of 3 minutes or more with this share of bursts is VO₂ max work whatever its average,
 * e.g. a set of 30/30s or 40/20s merged into one interval.
 */
const MICROBURST_SHARE = 0.3;
const VO2MAX_INTENSITY = 1.05;
const THRESHOLD_INTENSITY = 0.95;
/** Work above VO₂ max power for longer than this is sustained threshold work, such as a 20-minute test. */
const MAX_VO2MAX_REP_S = 10 * 60;
/** Anaerobic repetitions are shorter than this. */
const MAX_ANAEROBIC_REP_S = 2 * 60;
/** Threshold and sweet-spot blocks shorter than this are surges, not repetitions. */
const MIN_STEADY_REP_S = 3 * 60;
/** Repetitions count as alike when their lengths are within this share of the median. */
const REP_LENGTH_TOLERANCE = 0.25;
/** Most of a band's efforts must be alike: irregular surges in a group ride are not a set of repetitions. */
const MIN_ALIKE_SHARE = 0.6;
/** Outdoors, the work must be at least this share of the ride, so a few climbs on a long ride don't count. */
const OUTDOOR_MIN_WORK_SHARE = 0.1;

type WorkBand = 'anaerobic' | 'vo2max' | 'threshold' | 'sweetSpot';

/**
 * What a band needs to make the ride that kind of workout: enough work, in repetitions or in one
 * block at least `singleBlockS` long (1 × 20 min, or one set of 30/30s), else null.
 */
const BAND_RULES: Record<WorkBand, { minWorkS: number; minReps: number; singleBlockS: number | null; weight: number }> =
  {
    anaerobic: { minWorkS: 2 * 60, minReps: 3, singleBlockS: null, weight: 3 },
    vo2max: { minWorkS: 8 * 60, minReps: 2, singleBlockS: 8 * 60, weight: 2 },
    threshold: { minWorkS: 15 * 60, minReps: 2, singleBlockS: 15 * 60, weight: 1.2 },
    sweetSpot: { minWorkS: 20 * 60, minReps: 2, singleBlockS: 15 * 60, weight: 1 },
  };

/** Unstructured rides: thresholds on IF and on the share of riding time in power zones. */
const MIXED_MIN_IF = 0.85;
const MIXED_MIN_HARD_SHARE = 0.12;
const TEMPO_MIN_IF = 0.76;
const TEMPO_MIN_SHARE = 0.3;
const RECOVERY_MAX_IF = 0.55;
const RECOVERY_MAX_S = 75 * 60;
/**
 * A ride with this share in Z1–Z2 was easy whatever its IF: power spikes (a few readings of 1000 W
 * or more on a trainer) inflate NP, and with it IF.
 */
const MOSTLY_EASY_SHARE = 0.75;

/**
 * Heart-rate-only rides: thresholds on the share of time in the 5 Coggan HR zones. Generous,
 * because heart rate drifts up on long, hilly or warm endurance rides.
 */
const HR_MIXED_MIN_Z5_SHARE = 0.1;
const HR_THRESHOLD_MIN_SHARE = 0.3;
const HR_TEMPO_MIN_SHARE = 0.4;
const HR_RECOVERY_MIN_Z1_SHARE = 0.6;

/** One work interval, measured against FTP. */
export interface WorkInterval {
  durationS: number;
  /** Average power ÷ FTP. */
  intensity: number;
  /** Share of the interval's seconds at or above 120 % of FTP. */
  burstShare: number;
}

/**
 * Work intervals of a ride (detectIntervals at its defaults: 88 % of FTP and up), each with its
 * intensity and how much of it was bursts.
 */
export function workIntervalsOf(
  time: readonly number[],
  power: readonly (number | null)[],
  ftp: number,
): WorkInterval[] {
  const ranges = detectIntervals(time, power, ftp);
  const perSecondPower = perSecond(time, power, { fill: 'zero' });
  return ranges.map(({ startS, endS }) => {
    let sum = 0;
    let recorded = 0;
    let bursts = 0;
    for (let t = startS; t < endS; t++) {
      const watts = perSecondPower[t]!;
      if (Number.isNaN(watts)) continue;
      sum += watts;
      recorded++;
      if (watts >= BURST_INTENSITY * ftp) bursts++;
    }
    return {
      durationS: endS - startS,
      intensity: recorded ? sum / recorded / ftp : 0,
      burstShare: recorded ? bursts / recorded : 0,
    };
  });
}

export interface WorkoutTypeInput {
  isIndoor: boolean;
  /** Seconds per Coggan power zone (7), or null without power or an FTP. */
  powerZoneSeconds: readonly number[] | null;
  /** NP ÷ the FTP behind the power zones; null without power. */
  intensityFactor: number | null;
  workIntervals: readonly WorkInterval[];
  /** Seconds per Coggan heart-rate zone (5), or null without heart rate or an LTHR. */
  hrZoneSeconds: readonly number[] | null;
}

/** The repetitions that made a ride a structured workout. */
export interface WorkoutReps {
  count: number;
  /** Median repetition length. */
  durationS: number;
  /** Time-weighted average power of the repetitions ÷ FTP. */
  intensity: number;
}

export interface WorkoutClassification {
  type: WorkoutType;
  /** Power when the ride has power and an FTP; heart rate only gives a rough type. */
  basis: 'power' | 'hr';
  /** Set when the type comes from repeated work intervals. */
  reps: WorkoutReps | null;
}

/**
 * The kind of session a ride was. With power, repeated work intervals decide it (their intensity
 * and length); a ride without them is typed by its IF and time in zones. Heart rate alone gives a
 * rough type, since it lags too much to tell VO₂ max work from threshold work. Null for short
 * rides and rides with neither.
 */
export function classifyWorkout(input: WorkoutTypeInput): WorkoutClassification | null {
  if (input.powerZoneSeconds) {
    const ridingS = sum(input.powerZoneSeconds);
    if (ridingS < MIN_CLASSIFIED_S) return null;
    const structured = structuredWorkout(input.workIntervals, ridingS, input.isIndoor);
    // Keys in schema order, so a summary written now and one re-read from disk serialise alike.
    if (structured) return { type: structured.type, basis: 'power', reps: structured.reps };
    return { type: unstructuredType(input.powerZoneSeconds, input.intensityFactor), basis: 'power', reps: null };
  }
  if (input.hrZoneSeconds) {
    if (sum(input.hrZoneSeconds) < MIN_CLASSIFIED_S) return null;
    return { type: heartRateType(input.hrZoneSeconds), basis: 'hr', reps: null };
  }
  return null;
}

/** Which kind of work one interval is, or null for efforts that aren't repetitions (short surges). */
function bandOf(interval: WorkInterval): WorkBand | null {
  if (interval.intensity >= BURST_INTENSITY && interval.durationS < MAX_ANAEROBIC_REP_S) return 'anaerobic';
  const isMicrobursts = interval.burstShare >= MICROBURST_SHARE && interval.durationS >= MIN_STEADY_REP_S;
  if (isMicrobursts) return 'vo2max';
  if (interval.intensity >= VO2MAX_INTENSITY) return interval.durationS <= MAX_VO2MAX_REP_S ? 'vo2max' : 'threshold';
  if (interval.durationS < MIN_STEADY_REP_S) return null;
  if (interval.intensity >= THRESHOLD_INTENSITY) return 'threshold';
  return 'sweetSpot';
}

/** The strongest band of repeated work that qualifies, or null when the ride wasn't structured. */
function structuredWorkout(
  intervals: readonly WorkInterval[],
  ridingS: number,
  isIndoor: boolean,
): Omit<WorkoutClassification, 'basis'> | null {
  let best: { type: WorkBand; score: number; reps: WorkoutReps } | null = null;
  for (const band of Object.keys(BAND_RULES) as WorkBand[]) {
    const rule = BAND_RULES[band];
    const inBand = intervals.filter((interval) => bandOf(interval) === band);
    const workS = sum(inBand.map((interval) => interval.durationS));
    if (workS < rule.minWorkS) continue;
    if (!isIndoor && workS < OUTDOOR_MIN_WORK_SHARE * ridingS) continue;

    const { singleBlockS } = rule;
    const hasSingleBlock = singleBlockS !== null && inBand.some((interval) => interval.durationS >= singleBlockS);
    const alike = alikeCount(inBand);
    const hasRepeats = alike >= rule.minReps && alike >= MIN_ALIKE_SHARE * inBand.length;
    if (!hasSingleBlock && !hasRepeats) continue;

    const score = workS * rule.weight;
    if (best && best.score >= score) continue;
    best = { type: band, score, reps: summarizeReps(inBand, workS) };
  }
  return best ? { type: best.type, reps: best.reps } : null;
}

/** How many intervals are about as long as the median one. */
function alikeCount(intervals: readonly WorkInterval[]): number {
  const medianS = median(intervals.map((interval) => interval.durationS));
  return intervals.filter((interval) => Math.abs(interval.durationS - medianS) <= REP_LENGTH_TOLERANCE * medianS)
    .length;
}

function summarizeReps(intervals: readonly WorkInterval[], workS: number): WorkoutReps {
  let weightedIntensity = 0;
  for (const interval of intervals) weightedIntensity += interval.intensity * interval.durationS;
  return {
    count: intervals.length,
    durationS: median(intervals.map((interval) => interval.durationS)),
    intensity: weightedIntensity / workS,
  };
}

/** A ride without repeated work: by how hard it was overall and where the time went. */
function unstructuredType(zoneSeconds: readonly number[], intensityFactor: number | null): WorkoutType {
  const ridingS = sum(zoneSeconds);
  const hardShare = shareOf(zoneSeconds, 4, 6); // Z5–Z7
  const tempoShare = shareOf(zoneSeconds, 2, 3); // Z3–Z4
  const isMostlyEasy = shareOf(zoneSeconds, 0, 1) >= MOSTLY_EASY_SHARE;
  // A high IF only makes a ride harder when the zones agree it wasn't easy.
  const hardIntensity = isMostlyEasy ? 0 : (intensityFactor ?? 0);

  if (hardIntensity >= MIXED_MIN_IF || hardShare >= MIXED_MIN_HARD_SHARE) return 'mixed';
  if (hardIntensity >= TEMPO_MIN_IF || tempoShare >= TEMPO_MIN_SHARE) return 'tempo';
  const isShortAndEasy = intensityFactor !== null && intensityFactor < RECOVERY_MAX_IF && ridingS <= RECOVERY_MAX_S;
  if (isShortAndEasy) return 'recovery';
  return 'endurance';
}

/** A rough type from heart-rate zones alone. */
function heartRateType(zoneSeconds: readonly number[]): WorkoutType {
  const ridingS = sum(zoneSeconds);
  if (shareOf(zoneSeconds, 4, 4) >= HR_MIXED_MIN_Z5_SHARE) return 'mixed';
  if (shareOf(zoneSeconds, 3, 4) >= HR_THRESHOLD_MIN_SHARE) return 'threshold';
  if (shareOf(zoneSeconds, 2, 4) >= HR_TEMPO_MIN_SHARE) return 'tempo';
  const isShortAndEasy = shareOf(zoneSeconds, 0, 0) >= HR_RECOVERY_MIN_Z1_SHARE && ridingS <= RECOVERY_MAX_S;
  if (isShortAndEasy) return 'recovery';
  return 'endurance';
}

/** Share of all zoned time spent in zones `from`…`to` (0-based, inclusive). */
function shareOf(zoneSeconds: readonly number[], from: number, to: number): number {
  const total = sum(zoneSeconds);
  if (total === 0) return 0;
  return sum(zoneSeconds.slice(from, to + 1)) / total;
}

function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}
