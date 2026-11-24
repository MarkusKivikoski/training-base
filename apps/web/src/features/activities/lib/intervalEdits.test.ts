import { describe, expect, it } from 'vitest';
import {
  checkIntervalDraft,
  draftMark,
  nudgedClock,
  overlappingIntervals,
  parseClock,
  shownIntervals,
  trimDraft,
  withInterval,
  withoutInterval,
  withPickedTime,
  type IntervalDraft,
} from './intervalEdits';

const INTERVALS = [
  { startS: 600, endS: 900 },
  { startS: 1200, endS: 1500 },
  { startS: 1800, endS: 2100 },
];

const RIDE_END_S = 3600;

const adding = (start: string, end: string): IntervalDraft => ({ start, end, editingIndex: null });

describe('parseClock', () => {
  it('reads h:mm:ss, m:ss and bare minutes', () => {
    expect(parseClock('1:05:30')).toBe(3930);
    expect(parseClock('5:30')).toBe(330);
    expect(parseClock(' 12:05 ')).toBe(725);
    expect(parseClock('75:00')).toBe(4500);
    expect(parseClock('5')).toBe(300);
    expect(parseClock('0:00')).toBe(0);
  });

  it('rejects anything that isn’t a time', () => {
    expect(parseClock('')).toBeNull();
    expect(parseClock('5:60')).toBeNull();
    expect(parseClock('1:60:00')).toBeNull();
    expect(parseClock('1:2:3:4')).toBeNull();
    expect(parseClock('5.5')).toBeNull();
    expect(parseClock('-1:00')).toBeNull();
    expect(parseClock('abc')).toBeNull();
  });
});

describe('shownIntervals', () => {
  it('shows the detected intervals until some are set by hand, even none', () => {
    expect(shownIntervals(INTERVALS, null, RIDE_END_S)).toBe(INTERVALS);
    expect(shownIntervals(INTERVALS, [], RIDE_END_S)).toEqual([]);
    expect(shownIntervals(INTERVALS, [{ startS: 10, endS: 70 }], RIDE_END_S)).toEqual([{ startS: 10, endS: 70 }]);
  });

  it('drops or clips hand-set intervals past the end of the ride', () => {
    const handSet = [
      { startS: 600, endS: 900 },
      { startS: 1000, endS: 1300 },
      { startS: 1400, endS: 1500 },
    ];
    expect(shownIntervals([], handSet, 1200)).toEqual([
      { startS: 600, endS: 900 },
      { startS: 1000, endS: 1200 },
    ]);
  });
});

describe('editing the list', () => {
  it('removes one interval', () => {
    expect(withoutInterval(INTERVALS, 1)).toEqual([INTERVALS[0], INTERVALS[2]]);
  });

  it('adds an interval in time order', () => {
    expect(withInterval(INTERVALS, { startS: 1000, endS: 1100 }, null)).toEqual([
      INTERVALS[0],
      { startS: 1000, endS: 1100 },
      INTERVALS[1],
      INTERVALS[2],
    ]);
  });

  it('replaces the intervals a new one overlaps, so two can be joined into one', () => {
    const joined = { startS: 1150, endS: 2150 };
    expect(overlappingIntervals(INTERVALS, joined, null)).toEqual([1, 2]);
    expect(withInterval(INTERVALS, joined, null)).toEqual([INTERVALS[0], joined]);
    // Touching edges don't overlap: the end is exclusive.
    expect(overlappingIntervals(INTERVALS, { startS: 900, endS: 1200 }, null)).toEqual([]);
  });

  it('replaces the trimmed interval even where the new range no longer overlaps it', () => {
    expect(withInterval(INTERVALS, { startS: 620, endS: 880 }, 0)).toEqual([
      { startS: 620, endS: 880 },
      INTERVALS[1],
      INTERVALS[2],
    ]);
    expect(withInterval(INTERVALS, { startS: 2400, endS: 2500 }, 0)).toEqual([
      INTERVALS[1],
      INTERVALS[2],
      { startS: 2400, endS: 2500 },
    ]);
    expect(overlappingIntervals(INTERVALS, { startS: 1300, endS: 1900 }, 1)).toEqual([2]);
  });
});

describe('checkIntervalDraft', () => {
  it('waits for both times', () => {
    expect(checkIntervalDraft(adding('10:00', ''), INTERVALS, RIDE_END_S)).toEqual({ status: 'incomplete' });
  });

  it('explains what is wrong', () => {
    const check = (start: string, end: string) => checkIntervalDraft(adding(start, end), INTERVALS, RIDE_END_S);
    expect(check('10:70', '12:00')).toEqual({ status: 'invalid', message: 'Start: use m:ss or h:mm:ss.' });
    expect(check('10:00', 'x')).toEqual({ status: 'invalid', message: 'End: use m:ss or h:mm:ss.' });
    expect(check('12:00', '10:00')).toEqual({ status: 'invalid', message: 'The end must be after the start.' });
    expect(check('55:00', '1:05:00')).toEqual({ status: 'invalid', message: 'The ride ends at 1:00:00.' });
  });

  it('gives the range and the intervals it would replace', () => {
    expect(checkIntervalDraft(adding('2:00', '3:00'), INTERVALS, RIDE_END_S)).toEqual({
      status: 'valid',
      range: { startS: 120, endS: 180 },
      replaces: [],
      isUnchanged: false,
    });
    const stretched = { start: '20:00', end: '31:00', editingIndex: 1 };
    expect(checkIntervalDraft(stretched, INTERVALS, RIDE_END_S)).toMatchObject({ replaces: [2] });
  });

  it('knows when a trim changes nothing', () => {
    const untouched = trimDraft(INTERVALS, 1);
    expect(untouched).toEqual({ start: '20:00', end: '25:00', editingIndex: 1 });
    expect(checkIntervalDraft(untouched, INTERVALS, RIDE_END_S)).toMatchObject({ isUnchanged: true });
    const trimmed = { ...untouched, end: '24:40' };
    expect(checkIntervalDraft(trimmed, INTERVALS, RIDE_END_S)).toMatchObject({
      range: { startS: 1200, endS: 1480 },
      isUnchanged: false,
    });
  });
});

describe('picking times on the chart', () => {
  it('picks the start, then the end', () => {
    const withStart = withPickedTime(adding('', ''), 600.4);
    expect(withStart).toEqual(adding('10:00', ''));
    expect(withPickedTime(withStart, 900)).toEqual(adding('10:00', '15:00'));
  });

  it('swaps a second click that lies before the start', () => {
    expect(withPickedTime(adding('10:00', ''), 300)).toEqual(adding('5:00', '10:00'));
  });

  it('moves the nearer edge once both are set, trimming the interval', () => {
    const draft = trimDraft(INTERVALS, 0);
    expect(withPickedTime(draft, 620)).toEqual({ ...draft, start: '10:20' });
    expect(withPickedTime(draft, 870)).toEqual({ ...draft, end: '14:30' });
    expect(withPickedTime(draft, 960)).toEqual({ ...draft, end: '16:00' });
  });
});

describe('nudgedClock', () => {
  it('steps a time by seconds, not below zero', () => {
    expect(nudgedClock('10:00', 1)).toBe('10:01');
    expect(nudgedClock('10:00', -10)).toBe('9:50');
    expect(nudgedClock('59:59', 1)).toBe('1:00:00');
    expect(nudgedClock('0:03', -10)).toBe('0:00');
    expect(nudgedClock('oops', 1)).toBe('oops');
  });
});

describe('draftMark', () => {
  it('marks the start alone until the end is valid', () => {
    expect(draftMark(adding('', ''))).toBeNull();
    expect(draftMark(adding('10:00', ''))).toEqual({ startS: 600, endS: null, label: 'New' });
    expect(draftMark(adding('10:00', '9:00'))).toEqual({ startS: 600, endS: null, label: 'New' });
    expect(draftMark(trimDraft(INTERVALS, 2))).toEqual({ startS: 1800, endS: 2100, label: '3 trimmed' });
  });
});
