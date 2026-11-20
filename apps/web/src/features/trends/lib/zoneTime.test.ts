import { describe, expect, it } from 'vitest';
import { intensitySplit, splitPercent, totalSeconds, zoneBarValue } from './zoneTime';

describe('zone time', () => {
  it('splits time into easy, moderate and hard', () => {
    const split = intensitySplit([
      [600, 1200, 300, 100, 50],
      [0, 600, 0, 0, 0, 0, 150],
    ]);
    expect(split).toEqual({ easy: 2400, moderate: 300, hard: 300, total: 3000 });
    expect(splitPercent(split, split.easy)).toBe(80);
    expect(splitPercent(intensitySplit([]), 0)).toBe(0);
  });

  it('gives bar values in hours or as a share', () => {
    const seconds = [1800, 5400, 0];
    expect(totalSeconds(seconds)).toBe(7200);
    expect(zoneBarValue(seconds, 1, 'hours')).toBe(1.5);
    expect(zoneBarValue(seconds, 0, 'share')).toBe(25);
    expect(zoneBarValue([0, 0], 0, 'share')).toBe(0);
  });
});
