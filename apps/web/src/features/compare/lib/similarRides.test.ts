import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { matchedRides, rideLabel, ridesByYear, similarRides } from './similarRides';

const ride = (id: string, o: Partial<Activity> = {}) =>
  ({
    id,
    name: `Ride ${id}`,
    date: '2026-11-01',
    sport: 'road_biking',
    isIndoor: false,
    distanceM: 40000,
    ...o,
  }) as Activity;

describe('similar rides', () => {
  it('matches sport, indoor/outdoor and distance within 15%', () => {
    const base = ride('a');
    const rides = [
      base,
      ride('near', { distanceM: 45000 }),
      ride('far', { distanceM: 47000 }),
      ride('gravel', { sport: 'gravel_cycling' }),
      ride('indoor', { isIndoor: true }),
      ride('no-distance', { distanceM: null }),
    ];
    expect(similarRides(base, rides).map((r) => r.id)).toEqual(['near']);
  });

  it('ignores distance indoors and keeps at most 8', () => {
    const base = ride('a', { isIndoor: true, distanceM: 20000 });
    const rides = Array.from({ length: 12 }, (_, i) => ride(String(i), { isIndoor: true, distanceM: i * 10000 }));
    expect(similarRides(base, rides)).toHaveLength(8);
  });

  it('lists the other rides of the same workout or route, newest first', () => {
    const base = ride('b', { isIndoor: true });
    const rides = [ride('c', { isIndoor: true }), base, ride('a', { isIndoor: true }), ride('x', { isIndoor: true })];
    expect(matchedRides(base, rides, ['a', 'b', 'c']).map((r) => r.id)).toEqual(['c', 'a']);
    expect(matchedRides(base, rides, [])).toEqual([]);
  });

  it('labels rides and groups them by year', () => {
    expect(rideLabel(ride('1', { name: 'Loop' }))).toBe('1.11.2026 · Loop · 40.0 km');
    expect(rideLabel(ride('1', { name: 'Zwift', isIndoor: true }))).toBe('1.11.2026 · Zwift');
    const groups = ridesByYear([ride('1'), ride('2', { date: '2025-05-01' }), ride('3')]);
    expect(groups.map((g) => [g.year, g.rides.map((r) => r.id)])).toEqual([
      ['2026', ['1', '3']],
      ['2025', ['2']],
    ]);
  });
});
