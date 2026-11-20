import {
  ACTIVITY_SCHEMA_VERSION,
  STREAM_SCHEMA_VERSION,
  climbsFileSchema,
  type ActivityStream,
  type ActivitySummary,
} from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildClimbs, computeClimbs } from '../src/rebuild/climbs.js';

const M_PER_DEG = 111_195;

/** Flat 1 km, 500 m at 6 %, 500 m down, flat; along a north-south road at `mps`, 1 sample/s. */
function hillStream(mps: number, power: number | null = null): ActivityStream {
  const n = Math.round(3000 / mps);
  const y = Array.from({ length: n }, (_, i) => i * mps);
  const alt = (v: number) =>
    v < 1000 ? 20 : v < 1500 ? 20 + (v - 1000) * 0.06 : v < 2000 ? 50 - (v - 1500) * 0.06 : 20;
  return {
    schemaVersion: STREAM_SCHEMA_VERSION,
    time: y.map((_, i) => i),
    power: power === null ? null : y.map(() => power),
    hr: y.map(() => 150),
    cadence: null,
    speed: y.map(() => mps),
    altitude: y.map(alt),
    distance: y,
    lat: y.map((v) => 60 + v / M_PER_DEG),
    lng: y.map(() => 25),
    laps: null,
  };
}

function summary(id: string, date: string, o: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id,
    name: `Ride ${id}`,
    sport: 'cycling',
    isCycling: true,
    isRunning: false,
    isIndoor: false,
    startTimeLocal: `${date}T08:00:00`,
    startTimeUtc: `${date}T06:00:00.000Z`,
    date,
    durationS: 600,
    movingDurationS: 600,
    distanceM: 3000,
    elevationGainM: 30,
    avgSpeedMps: 5,
    maxSpeedMps: 6,
    avgHr: 150,
    maxHr: 160,
    avgCadence: null,
    maxCadence: null,
    avgPower: null,
    maxPower: null,
    activeCalories: null,
    hasPower: false,
    metrics: null,
    meanMaxPower: null,
    hrLoad: null,
    load: null,
    zones: { power: null, hr: null },
    records: null,
    climbs: null,
    hrPeak5s: null,
    lthrEstimate: null,
    decoupling: null,
    workoutType: null,
    mergedFrom: null,
    ...o,
  };
}

describe('computeClimbs', () => {
  it('detects climbs on outdoor rides only', () => {
    expect(computeClimbs(hillStream(5), { isCycling: true, isIndoor: false })).toHaveLength(1);
    expect(computeClimbs(hillStream(5), { isCycling: true, isIndoor: true })).toBeNull();
    expect(computeClimbs({ ...hillStream(5), altitude: null }, { isCycling: true, isIndoor: false })).toBeNull();
  });
});

describe('buildClimbs', () => {
  it('groups the same hill across rides and ranks every effort on it', async () => {
    const streams: Record<string, ActivityStream> = { '1': hillStream(4), '2': hillStream(5, 250), '3': hillStream(5) };
    const climbsOf = (id: string) => computeClimbs(streams[id]!, { isCycling: true, isIndoor: false });
    const summaries = [
      summary('2', '2026-06-01', { climbs: climbsOf('2'), hasPower: true }),
      summary('1', '2026-05-01', { climbs: climbsOf('1') }),
      // Ride 3 didn't detect the climb (as if its altitude was noisy) but still rode it.
      summary('3', '2026-07-01', { climbs: [] }),
      summary('4', '2026-07-02', { isIndoor: true }),
    ];
    const file = await buildClimbs(summaries, async (id) => streams[id] ?? null, {
      generatedAt: '2026-11-08T00:00:00.000Z',
    });
    expect(() => climbsFileSchema.parse(file)).not.toThrow();
    expect(file.climbs).toHaveLength(1);
    const c = file.climbs[0]!;
    expect(c.id).toBe('1-0'); // defined by the oldest ride
    expect(c.efforts.map((e) => e.activityId)).toEqual(['1', '2', '3']);
    expect(c.efforts.map((e) => e.rank)).toEqual([3, 1, 2]); // 4 m/s is slowest; same time → older first
    expect(c.efforts[1]).toMatchObject({ avgPower: 250, avgHr: 150 });
    expect(c.efforts[0]!.avgPower).toBeNull();
    expect(c.path.length).toBeGreaterThanOrEqual(2);
    expect(c.profile[0]![0]).toBe(0);
    expect(c.profile.at(-1)![1]).toBeGreaterThan(c.profile[0]![1] + 20);
  });
});
