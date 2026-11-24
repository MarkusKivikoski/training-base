import { describe, expect, it } from 'vitest';
import { draftSummary, intervalNumbersText } from './intervalDraftText';
import type { DraftCheck } from './intervalEdits';
import { testStream } from './testStream';

const seconds = (count: number) => Array.from({ length: count }, (_, i) => i);

const STREAM = testStream({
  time: seconds(600),
  power: [...Array(300).fill(100), ...Array(300).fill(250)],
  hr: Array(600).fill(150),
});

describe('intervalNumbersText', () => {
  it('lists interval numbers in words', () => {
    expect(intervalNumbersText([2])).toBe('interval 3');
    expect(intervalNumbersText([1, 2])).toBe('intervals 2 and 3');
    expect(intervalNumbersText([0, 1, 2])).toBe('intervals 1, 2 and 3');
  });
});

describe('draftSummary', () => {
  it('says nothing until both times are in, then what is wrong', () => {
    expect(draftSummary(null, STREAM, 250)).toBeNull();
    expect(draftSummary({ status: 'incomplete' }, STREAM, 250)).toBeNull();
    expect(draftSummary({ status: 'invalid', message: 'The end must be after the start.' }, STREAM, 250)).toBe(
      'The end must be after the start.',
    );
  });

  it('sums up the interval it would save', () => {
    const check: DraftCheck = { status: 'valid', range: { startS: 300, endS: 600 }, replaces: [1], isUnchanged: false };
    expect(draftSummary(check, STREAM, 250)).toBe('5:00 · 250 W avg · 100% of FTP · 150 bpm · replaces interval 2');
    expect(draftSummary({ ...check, replaces: [] }, STREAM, null)).toBe('5:00 · 250 W avg · 150 bpm');
  });
});
