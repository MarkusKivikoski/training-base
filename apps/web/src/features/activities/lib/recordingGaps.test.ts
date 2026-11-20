import { describe, expect, it } from 'vitest';
import { gapText, recordingGapDurations, recordingGapRanges, recordingGapsS, type MergedParts } from './recordingGaps';

const parts: MergedParts = [
  { id: '1', startS: 0, durationS: 600 },
  { id: '2', startS: 1200, durationS: 600 },
  { id: '3', startS: 2400, durationS: 300 },
];

describe('recording gaps', () => {
  it('measures the time between recordings from the summaries', () => {
    expect(recordingGapsS(parts)).toEqual([600, 600]);
  });

  it('never reports a negative gap when start times overlap slightly', () => {
    const overlapping: MergedParts = [
      { id: '1', startS: 0, durationS: 600 },
      { id: '2', startS: 590, durationS: 300 },
    ];
    expect(recordingGapsS(overlapping)).toEqual([0]);
  });

  it('finds each gap on the stream’s clock, allowing an early first record', () => {
    const time = [0, 1, 599, 1190, 1202, 1799, 2401];
    expect(recordingGapRanges(time, parts)).toEqual([
      { startS: 599, endS: 1190 },
      { startS: 1799, endS: 2401 },
    ]);
  });

  it('prefers the stream’s gaps, which include a pause before a recording was stopped', () => {
    const streamGaps = [
      { startS: 300, endS: 1200 },
      { startS: 1799, endS: 2401 },
    ];
    expect(recordingGapDurations(parts, streamGaps)).toEqual([900, 602]);
    // Without a stream gap for every recording, the summaries decide.
    expect(recordingGapDurations(parts, streamGaps.slice(1))).toEqual([600, 600]);
    expect(recordingGapDurations(parts, null)).toEqual([600, 600]);
  });

  it('words a gap, saying "under a minute" rather than 0 min', () => {
    expect(gapText(22)).toBe('under a minute');
    expect(gapText(1200)).toBe('20 min');
  });

  it('skips a recording with nothing recorded before it', () => {
    expect(recordingGapRanges([1200, 1201], parts.slice(0, 2))).toEqual([]);
  });
});
