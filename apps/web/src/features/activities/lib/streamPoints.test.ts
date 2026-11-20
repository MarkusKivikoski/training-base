import { describe, expect, it } from 'vitest';
import { indexAtTime, toChartPoints } from './streamPoints';

describe('toChartPoints', () => {
  it('bridges missing records and breaks the line at pauses', () => {
    expect(toChartPoints([0, 1, 2, 3, 40], [10, null, 12, 13, 14], 2)).toEqual([
      [0, 20],
      [2, 24],
      [3, 26],
      [4, null],
      [40, 28],
    ]);
  });
});

describe('indexAtTime', () => {
  it('finds the last sample at or before a time', () => {
    const time = [0, 5, 10, 20];
    expect(indexAtTime(time, 0)).toBe(0);
    expect(indexAtTime(time, 7)).toBe(1);
    expect(indexAtTime(time, 20)).toBe(3);
    expect(indexAtTime(time, 99)).toBe(3);
  });
});
