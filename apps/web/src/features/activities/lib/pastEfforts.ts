import { efficiencyFactor, efficiencyTrend, type EfficiencyTrend } from '@app/metrics';
import type { RideWorkout, WorkoutEffort, WorkoutSummary } from '@/shared/api/client';
import {
  formatClock,
  formatDate,
  formatDuration,
  formatHeartRate,
  formatHeartRateChange,
  formatPercentChange,
  formatPower,
} from '@/shared/lib/formatters';
import type { EffortChartPoint, EffortPanel } from './effortChart';

/** What a workout's label is built from: the card's workout and the picker's summaries both have it. */
type WorkoutLabelInput = Pick<WorkoutSummary, 'name' | 'durationS' | 'blocks'>;

/** Work blocks are found to within a few seconds, so their length is shown to the nearest half minute. */
const BLOCK_ROUNDING_S = 30;

/** Blocks within this share of the middle one count as equally long ("6 × 4:00"). */
const SIMILAR_BLOCK_SHARE = 0.15;

/** The workout chart: power above heart rate. */
export const WORKOUT_CHART_PANELS: readonly EffortPanel[] = [
  { title: 'Power', unit: 'W', slot: '--series-1' },
  { title: 'Heart rate', unit: 'bpm', slot: '--series-2' },
];

const HEADLINES: Record<EfficiencyTrend, string> = {
  up: 'More power per heartbeat',
  same: 'About the same power per heartbeat',
  down: 'Less power per heartbeat',
};

/** "6 × 4:00" when the work blocks are about equally long, else "6 work intervals"; null without blocks. */
export const blocksLabel = (blocks: WorkoutLabelInput['blocks']): string | null => {
  if (blocks.length === 0) return null;
  const durations = blocks.map((block) => block.endS - block.startS).sort((a, b) => a - b);
  const middle = durations[Math.floor(durations.length / 2)]!;
  const areSimilar = durations.every((duration) => Math.abs(duration - middle) <= middle * SIMILAR_BLOCK_SHARE);
  if (!areSimilar) return `${blocks.length} work intervals`;

  const rounded = Math.max(BLOCK_ROUNDING_S, Math.round(middle / BLOCK_ROUNDING_S) * BLOCK_ROUNDING_S);
  return `${blocks.length} × ${formatClock(rounded)}`;
};

/** The name the user gave the workout, or a label from its shape: "6 × 4:00 · 1 h 29 min", "1 h 3 min workout". */
export const workoutTitle = (workout: WorkoutLabelInput): string => {
  if (workout.name) return workout.name;
  const blocks = blocksLabel(workout.blocks);
  const duration = formatDuration(workout.durationS);
  return blocks ? `${blocks} · ${duration}` : `${duration} workout`;
};

/** A workout in the picker: its title, when it was first ridden and how often. */
export const workoutOptionLabel = (workout: WorkoutSummary): string => {
  const rides = workout.efforts === 1 ? '1 ride' : `${workout.efforts} rides`;
  return `${workoutTitle(workout)} · first ${formatDate(workout.firstDate)} · ${rides}`;
};

export type EffortRow = {
  effort: WorkoutEffort;
  /** What the efforts are compared on: the work blocks when the workout has them, else NP and average heart rate. */
  power: number | null;
  hr: number | null;
  wattsPerBeat: number | null;
  /** Effort rating (1–10) from the ride's note. */
  rating: number | null;
  isCurrent: boolean;
  /** The ride ended before the workout's last work block. */
  isCutShort: boolean;
};

/** One row per effort on the workout, newest first, marking the ride being viewed. */
export const effortRows = (workout: RideWorkout, activityId: string): EffortRow[] => {
  const hasBlocks = workout.blocks.length > 0;
  const rows = workout.efforts.map((effort): EffortRow => {
    const power = hasBlocks ? (effort.work?.avgPower ?? null) : effort.np;
    const hr = hasBlocks ? (effort.work?.avgHr ?? null) : effort.avgHr;
    return {
      effort,
      power,
      hr,
      wattsPerBeat: efficiencyFactor(power, hr),
      rating: workout.ratings[effort.activityId] ?? null,
      isCurrent: effort.activityId === activityId,
      isCutShort: effort.blocks.some((block) => block === null),
    };
  });
  return rows.reverse();
};

/** The efforts as chart points, oldest first, with values in WORKOUT_CHART_PANELS order. `rows` are newest first. */
export const workoutChartPoints = (rows: readonly EffortRow[]): EffortChartPoint[] => {
  const oldestFirst = [...rows].reverse();
  return oldestFirst.map((row) => ({
    date: row.effort.date,
    isCurrent: row.isCurrent,
    values: [row.power, row.hr],
    tooltip: `${formatDate(row.effort.date)}: <b>${formatPower(row.power)}</b> at <b>${formatHeartRate(row.hr)}</b>`,
  }));
};

/** What the power and heart-rate numbers cover, for the card's footnote. */
export const comparedOnText = (workout: Pick<RideWorkout, 'blocks'>): string => {
  if (workout.blocks.length === 0) return 'Power is normalized power and heart rate the average, over the whole ride.';
  const noun = workout.blocks.length === 1 ? 'work interval' : `${workout.blocks.length} work intervals`;
  return `Power and heart rate are averages over the ${noun} (88% of FTP or more on the first ride of this workout).`;
};

export type EffortVerdict = {
  trend: EfficiencyTrend;
  headline: string;
  detail: string;
};

/** How this effort compares with the ones before it, in words. */
export const effortVerdict = (change: NonNullable<WorkoutEffort['change']>): EffortVerdict => {
  const trend = efficiencyTrend(change.efficiencyPct);
  const against =
    change.againstCount === 1 ? 'your previous effort' : `the median of your previous ${change.againstCount} efforts`;
  const detail = `${formatPercentChange(change.efficiencyPct)} W per beat against ${against}: power ${formatPercentChange(change.powerPct)}, heart rate ${formatHeartRateChange(change.hrBpm)}.`;
  return { trend, headline: HEADLINES[trend], detail };
};
