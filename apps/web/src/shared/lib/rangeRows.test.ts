import { describe, expect, it } from 'vitest';
import type { ActivityStreams } from '@/shared/api/client';
import { lapRows } from './rangeRows';

const seconds = (count: number) => Array.from({ length: count }, (_, i) => i);
const lap = (startS: number, endS: number) => ({ startS, endS, trigger: null });

const stream = (channels: Partial<ActivityStreams>) =>
  ({
    time: [],
    power: null,
    hr: null,
    cadence: null,
    speed: null,
    distance: null,
    laps: null,
    ...channels,
  }) as ActivityStreams;

describe('lapRows', () => {
  it('lists laps only when there is more than one', () => {
    expect(lapRows(stream({ time: seconds(10), laps: [lap(0, 10)] }))).toEqual([]);
    const rows = lapRows(stream({ time: seconds(10), hr: Array(10).fill(140), laps: [lap(0, 5), lap(5, 10)] }));
    expect(rows.map((row) => [row.startS, row.endS, row.durationS, row.avgHr])).toEqual([
      [0, 5, 5, 140],
      [5, 10, 5, 140],
    ]);
  });
});
