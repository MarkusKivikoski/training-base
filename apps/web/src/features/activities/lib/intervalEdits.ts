import type { TimeRange } from '@app/metrics';
import { formatClock } from '@/shared/lib/formatters';

/** An interval being added, or an existing one being trimmed, as typed in the form. */
export type IntervalDraft = {
  start: string;
  end: string;
  /** Index of the interval being trimmed; null when adding a new one. */
  editingIndex: number | null;
};

/** What the draft would save: nothing yet, a problem to fix, or a range (and the intervals it replaces). */
export type DraftCheck =
  | { status: 'incomplete' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; range: TimeRange; replaces: number[]; isUnchanged: boolean };

/** The draft on the ride chart: its range, or only its start while the end is still to pick. */
export type DraftMark = { startS: number; endS: number | null; label: string };

const CLOCK_PATTERN = /^\d+(:\d{1,2}){0,2}$/;

/** "1:05:30", "5:30", or "5" (minutes) as seconds; null when it isn't a time. */
export const parseClock = (text: string): number | null => {
  const trimmed = text.trim();
  if (!CLOCK_PATTERN.test(trimmed)) return null;

  const parts = trimmed.split(':').map(Number);
  if (parts.length === 1) return parts[0]! * 60;
  // Minutes after hours, and seconds, stay below 60.
  const hasOverflow = parts.slice(1).some((part) => part >= 60);
  if (hasOverflow) return null;

  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return seconds;
};

/** The hand-set intervals when there are any (even an empty list), else the detected ones; clipped to the ride. */
export const shownIntervals = (
  detected: readonly TimeRange[],
  handSet: readonly TimeRange[] | null,
  rideEndS: number,
): readonly TimeRange[] => {
  if (handSet === null) return detected;
  // A ride split back from a merge is shorter than when its intervals were set.
  const withinRide = handSet.filter((range) => range.startS < rideEndS);
  return withinRide.map((range) => ({ startS: range.startS, endS: Math.min(range.endS, rideEndS) }));
};

const overlaps = (a: TimeRange, b: TimeRange) => a.startS < b.endS && b.startS < a.endS;

/** Indices of the intervals `range` overlaps, leaving out the one being trimmed. */
export const overlappingIntervals = (
  intervals: readonly TimeRange[],
  range: TimeRange,
  editingIndex: number | null,
): number[] => {
  const indices: number[] = [];
  intervals.forEach((interval, index) => {
    if (index !== editingIndex && overlaps(interval, range)) indices.push(index);
  });
  return indices;
};

/** The intervals without the one at `index`. */
export const withoutInterval = (intervals: readonly TimeRange[], index: number): TimeRange[] =>
  intervals.filter((_, i) => i !== index);

/**
 * The intervals with `range` in time order: it replaces the interval being trimmed, and any it
 * overlaps.
 */
export const withInterval = (
  intervals: readonly TimeRange[],
  range: TimeRange,
  editingIndex: number | null,
): TimeRange[] => {
  const replaced = new Set(overlappingIntervals(intervals, range, editingIndex));
  if (editingIndex !== null) replaced.add(editingIndex);
  const kept = intervals.filter((_, index) => !replaced.has(index));
  return [...kept, range].sort((a, b) => a.startS - b.startS);
};

/** Checks the typed start and end against the ride and its other intervals. */
export const checkIntervalDraft = (
  draft: IntervalDraft,
  intervals: readonly TimeRange[],
  rideEndS: number,
): DraftCheck => {
  if (draft.start.trim() === '' || draft.end.trim() === '') return { status: 'incomplete' };

  const startS = parseClock(draft.start);
  const endS = parseClock(draft.end);
  if (startS === null) return { status: 'invalid', message: 'Start: use m:ss or h:mm:ss.' };
  if (endS === null) return { status: 'invalid', message: 'End: use m:ss or h:mm:ss.' };
  if (endS <= startS) return { status: 'invalid', message: 'The end must be after the start.' };
  if (startS >= rideEndS) return { status: 'invalid', message: `The ride ends at ${formatClock(rideEndS)}.` };
  if (endS > rideEndS) return { status: 'invalid', message: `The ride ends at ${formatClock(rideEndS)}.` };

  const range = { startS, endS };
  const original = draft.editingIndex === null ? undefined : intervals[draft.editingIndex];
  const isUnchanged = original !== undefined && original.startS === startS && original.endS === endS;
  return { status: 'valid', range, replaces: overlappingIntervals(intervals, range, draft.editingIndex), isUnchanged };
};

/** A form draft for trimming the interval at `index`. */
export const trimDraft = (intervals: readonly TimeRange[], index: number): IntervalDraft => {
  const interval = intervals[index]!;
  return { start: formatClock(interval.startS), end: formatClock(interval.endS), editingIndex: index };
};

/**
 * The draft after a click on the ride chart at `seconds`: the first click picks the start, the
 * second the end (swapping them if it lies before the start). Once both are set, a click moves the
 * nearer edge, which is how an interval is trimmed or stretched from the chart.
 */
export const withPickedTime = (draft: IntervalDraft, seconds: number): IntervalDraft => {
  const picked = formatClock(seconds);
  const startS = parseClock(draft.start);
  const endS = parseClock(draft.end);

  if (startS === null) return { ...draft, start: picked };
  if (endS === null) {
    const isBeforeStart = seconds < startS;
    if (isBeforeStart) return { ...draft, start: picked, end: formatClock(startS) };
    return { ...draft, end: picked };
  }

  const isNearerStart = Math.abs(seconds - startS) <= Math.abs(seconds - endS);
  if (isNearerStart) return { ...draft, start: picked };
  return { ...draft, end: picked };
};

/** The draft time moved by `stepS` seconds (never below zero); unchanged when it isn't a time yet. */
export const nudgedClock = (text: string, stepS: number): string => {
  const seconds = parseClock(text);
  if (seconds === null) return text;
  return formatClock(Math.max(0, seconds + stepS));
};

/** Where the draft shows on the ride chart, or null before it has a start. */
export const draftMark = (draft: IntervalDraft): DraftMark | null => {
  const startS = parseClock(draft.start);
  if (startS === null) return null;

  const endS = parseClock(draft.end);
  const hasEnd = endS !== null && endS > startS;
  const label = draft.editingIndex === null ? 'New' : `${draft.editingIndex + 1} trimmed`;
  return { startS, endS: hasEnd ? endS : null, label };
};
