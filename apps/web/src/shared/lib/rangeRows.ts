import { rangeStats, type RangeStats, type TimeRange } from '@app/metrics';
import type { ActivityStreams } from '@/shared/api/client';

export type RangeRow = TimeRange & RangeStats;

/** Ranges with their stats from the stream. */
export const withRangeStats = (stream: ActivityStreams, ranges: readonly TimeRange[]): RangeRow[] =>
  ranges.map((range) => ({ startS: range.startS, endS: range.endS, ...rangeStats(stream, range) }));

/** Device laps with their stats, only when there is more than one (one lap is just the ride). */
export const lapRows = (stream: ActivityStreams): RangeRow[] => {
  const laps = stream.laps ?? [];
  if (laps.length <= 1) return [];
  return withRangeStats(stream, laps);
};
