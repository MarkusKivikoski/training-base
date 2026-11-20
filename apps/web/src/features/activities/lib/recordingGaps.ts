import type { TimeRange } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { formatDuration } from '@/shared/lib/formatters';

export type MergedParts = NonNullable<Activity['mergedFrom']>;

/** Device and summary start times differ by a few seconds, so a recording's first record may come slightly early. */
const START_TOLERANCE_S = 60;

/** A gap between recordings in words; restarting within a minute would otherwise read "0 min". */
export const gapText = (seconds: number): string => (seconds < 60 ? 'under a minute' : formatDuration(seconds));

/** Seconds nothing was recorded between each recording and the next, from the summaries. */
export const recordingGapsS = (parts: MergedParts): number[] =>
  parts.slice(1).map((part, i) => {
    const previous = parts[i]!;
    const previousEndS = previous.startS + previous.durationS;
    return Math.max(0, part.startS - previousEndS);
  });

/**
 * Seconds not recorded before each later recording. From the stream's gaps when there is one for
 * every recording: a recording paused for a while before it was stopped counts as a gap there,
 * though Garmin's duration includes the pause. Otherwise from the summaries.
 */
export const recordingGapDurations = (parts: MergedParts, streamGaps: readonly TimeRange[] | null): number[] => {
  const hasEveryStreamGap = streamGaps !== null && streamGaps.length === parts.length - 1;
  if (!hasEveryStreamGap) return recordingGapsS(parts);
  return streamGaps.map((gap) => gap.endS - gap.startS);
};

/**
 * The gaps on the stream's clock: from the last record before each later recording to that
 * recording's first record, for shading the ride charts.
 */
export const recordingGapRanges = (time: readonly number[], parts: MergedParts): TimeRange[] => {
  const ranges: TimeRange[] = [];
  for (const part of parts.slice(1)) {
    const firstIndex = time.findIndex((seconds) => seconds >= part.startS - START_TOLERANCE_S);
    const hasRecordBefore = firstIndex > 0;
    if (!hasRecordBefore) continue;
    ranges.push({ startS: time[firstIndex - 1]!, endS: time[firstIndex]! });
  }
  return ranges;
};
