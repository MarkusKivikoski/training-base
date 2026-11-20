import { describe, expect, it } from 'vitest';
import type { Activity, Gear } from '@/shared/api/client';
import {
  bikeByType,
  bikeFor,
  bikeTotals,
  componentsNeedingAttention,
  componentUsage,
  tyreFor,
  tyreTotals,
} from './gear';

const ride = (id: string, date: string, sport: string, km: number, o: Partial<Activity> = {}) =>
  ({
    id,
    date,
    sport,
    isCycling: true,
    distanceM: km * 1000,
    durationS: 3600,
    movingDurationS: 3600,
    ...o,
  }) as Activity;

const gear = (o: Partial<Gear> = {}): Gear => ({
  schemaVersion: 1,
  bikes: [
    { id: 'road', name: 'Road', types: ['road_biking', 'cycling'], retired: false },
    { id: 'old', name: 'Old', types: ['gravel_cycling'], retired: true },
    { id: 'gravel', name: 'Gravel', types: ['gravel_cycling'], retired: false },
  ],
  components: [],
  overrides: {},
  tyres: [
    { id: 'road', name: 'Road' },
    { id: 'gravel', name: 'Gravel' },
  ],
  rideTyres: {},
  ...o,
});

describe('tyres', () => {
  it('finds the tyres a ride was tagged with', () => {
    const tagged = gear({ rideTyres: { '1': 'gravel', '2': 'road', '3': 'gravel', '4': 'removed' } });
    expect(tyreFor('1', tagged)).toEqual({ id: 'gravel', name: 'Gravel' });
    expect(tyreFor('9', tagged)).toBeNull();
    // A tag left over from tyres that no longer exist reads as untagged.
    expect(tyreFor('4', tagged)).toBeNull();
  });

  it('adds up the distance and riding time of the rides tagged with each set of tyres', () => {
    const tagged = gear({ rideTyres: { '1': 'gravel', '2': 'road', '3': 'gravel', '4': 'removed' } });
    const rides = [
      ride('1', '2026-10-15', 'gravel_cycling', 36.9),
      ride('2', '2026-09-01', 'road_biking', 60, { movingDurationS: 7200 }),
      ride('3', '2026-10-18', 'gravel_cycling', 35.7, { movingDurationS: null, durationS: 5400 }),
      // Tagged with tyres that no longer exist, and not tagged at all: neither counts.
      ride('4', '2026-08-01', 'road_biking', 40),
      ride('5', '2026-08-02', 'road_biking', 50),
    ];
    const totals = tyreTotals(rides, tagged);
    expect([...totals.keys()]).toEqual(['gravel', 'road']);
    expect(totals.get('gravel')!.distanceM).toBeCloseTo(72_600, 6);
    expect(totals.get('gravel')).toMatchObject({ movingS: 9000, rides: 2 });
    expect(totals.get('road')).toEqual({ distanceM: 60_000, movingS: 7200, rides: 1 });
  });
});

describe('bike assignment', () => {
  it('assigns by type, skipping retired bikes, and honours overrides', () => {
    expect(bikeFor(ride('1', '2026-11-01', 'gravel_cycling', 30), gear())?.id).toBe('gravel');
    expect(bikeFor(ride('1', '2026-11-01', 'indoor_cycling', 30), gear())).toBeNull();
    const overridden = gear({ overrides: { '1': 'road' } });
    expect(bikeFor(ride('1', '2026-11-01', 'gravel_cycling', 30), overridden)?.id).toBe('road');
    expect(bikeByType(ride('1', '2026-11-01', 'gravel_cycling', 30), overridden)?.id).toBe('gravel');
    expect(bikeFor(ride('1', '2026-11-01', 'road_biking', 30), gear({ overrides: { '1': 'none' } }))).toBeNull();
    expect(bikeFor(ride('1', '2026-11-01', 'road_biking', 30, { isCycling: false }), gear())).toBeNull();
  });

  it('totals distance, time and rides per bike', () => {
    const rides = [
      ride('1', '2026-11-01', 'road_biking', 40),
      ride('2', '2026-11-02', 'cycling', 20),
      ride('3', '2026-11-03', 'gravel_cycling', 35),
    ];
    const totals = bikeTotals(rides, gear());
    expect(totals.get('road')).toEqual({ distanceM: 60000, movingS: 7200, rides: 2 });
    expect(totals.get('gravel')?.rides).toBe(1);
  });
});

describe('component usage', () => {
  const chain = { id: 'chain', bikeId: 'road', name: 'Chain', installedOn: '2026-06-01', intervalKm: 100 };
  const rides = [
    ride('old', '2026-05-01', 'road_biking', 500),
    ride('a', '2026-07-01', 'road_biking', 50),
    ride('b', '2026-08-01', 'road_biking', 42),
    ride('g', '2026-08-02', 'gravel_cycling', 80),
  ];

  it('counts rides on its bike since it was fitted', () => {
    const usage = componentUsage(chain, rides, gear());
    expect(usage).toMatchObject({ distanceM: 92000, movingS: 7200, status: 'soon' });
    expect(usage.fraction).toBeCloseTo(0.92, 6);
  });

  it('uses the more worn of distance and time, and tracks parts without an interval', () => {
    const tyre = { ...chain, id: 'tyre', intervalKm: 1000, intervalHours: 2 };
    expect(componentUsage(tyre, rides, gear()).status).toBe('due');
    const bell = { id: 'bell', bikeId: 'road', name: 'Bell', installedOn: '2026-06-01' };
    expect(componentUsage(bell, rides, gear())).toMatchObject({ fraction: null, status: 'untracked' });
  });

  it('lists what needs attention, most worn first', () => {
    const tyre = { ...chain, id: 'tyre', intervalKm: 1000, intervalHours: 2 };
    const fresh = { ...chain, id: 'fresh', intervalKm: 5000 };
    const list = componentsNeedingAttention(rides, gear({ components: [chain, tyre, fresh] }));
    expect(list.map((usage) => usage.component.id)).toEqual(['tyre', 'chain']);
  });
});
