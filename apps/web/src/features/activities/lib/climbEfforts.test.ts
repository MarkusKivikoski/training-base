import { describe, expect, it } from 'vitest';
import type { RideClimb } from '@/shared/api/client';
import { bestTimeCount, climbEffortRows, climbsCardTitle } from './climbEfforts';

const rideClimb = (id: string, totalEfforts: number, ranks: number[]) =>
  ({ climb: { id, efforts: totalEfforts }, efforts: ranks.map((rank) => ({ rank })) }) as unknown as RideClimb;

describe('climb efforts', () => {
  it('flattens efforts and counts best times on climbs ridden before', () => {
    const rows = climbEffortRows([rideClimb('a', 5, [1, 3]), rideClimb('b', 1, [1])]);
    expect(rows.map((row) => [row.climb.id, row.effort.rank])).toEqual([
      ['a', 1],
      ['a', 3],
      ['b', 1],
    ]);
    expect(bestTimeCount(rows)).toBe(1);
  });

  it('titles the card', () => {
    expect(climbsCardTitle(0)).toBe('Climbs');
    expect(climbsCardTitle(1)).toBe('Climbs · 1 best time');
    expect(climbsCardTitle(2)).toBe('Climbs · 2 best times');
  });
});
