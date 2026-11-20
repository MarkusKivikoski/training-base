import { describe, expect, it } from 'vitest';
import type { RideClimb } from '@/shared/api/client';
import { climbRanges, hasPowerData, percentOfFtp, workIntervals } from './rideIntervals';
import { testStream } from './testStream';

const seconds = (count: number) => Array.from({ length: count }, (_, i) => i);

describe('ride intervals', () => {
  it('finds no work intervals without power or FTP', () => {
    expect(workIntervals(testStream({ time: seconds(3) }), 200)).toEqual([]);
    expect(workIntervals(testStream({ time: seconds(3), power: [300, 300, 300] }), null)).toEqual([]);
  });

  it('detects a hard minute as one interval', () => {
    const power = [...Array(60).fill(100), ...Array(60).fill(300), ...Array(60).fill(100)];
    const intervals = workIntervals(testStream({ time: seconds(180), power }), 200);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]!.endS - intervals[0]!.startS).toBeGreaterThanOrEqual(50);
  });

  it('turns climb efforts into time ranges', () => {
    const rideClimbs = [
      { efforts: [{ startS: 100, timeS: 60 }] },
      { efforts: [{ startS: 500, timeS: 30 }] },
    ] as unknown as RideClimb[];
    expect(climbRanges(rideClimbs)).toEqual([
      { startS: 100, endS: 160 },
      { startS: 500, endS: 530 },
    ]);
  });

  it('checks for power and formats % of FTP', () => {
    expect(hasPowerData(testStream({ power: [null, 0] }))).toBe(false);
    expect(hasPowerData(testStream({ power: [null, 120] }))).toBe(true);
    expect(percentOfFtp(184, 200)).toBe('92%');
    expect(percentOfFtp(null, 200)).toBeNull();
  });
});
