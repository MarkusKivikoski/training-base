import { ACTIVITY_SCHEMA_VERSION, routeGroupSchema, type ActivitySummary } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildRouteGroups } from '../src/rebuild/repeatRoutes.js';

type Line = Array<[number, number]>;

const METRES_PER_DEG_LAT = 111_320;
const METRES_PER_DEG_LNG = METRES_PER_DEG_LAT * Math.cos((60 * Math.PI) / 180);
const at = (eastM: number, northM: number): [number, number] => [
  25 + eastM / METRES_PER_DEG_LNG,
  60 + northM / METRES_PER_DEG_LAT,
];

/** A 2 km × 1 km rectangle ridden anticlockwise, shifted by `driftM` metres. */
const loop = (driftM = 0): Line => [
  at(driftM, driftM),
  at(2000 + driftM, driftM),
  at(2000 + driftM, 1000 + driftM),
  at(driftM, 1000 + driftM),
  at(driftM, driftM),
];
const LOOP_M = 6000;

function summary(id: string, date: string, movingS: number, overrides: Partial<ActivitySummary> = {}): ActivitySummary {
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
    durationS: movingS + 60,
    movingDurationS: movingS,
    distanceM: LOOP_M,
    elevationGainM: 20,
    avgSpeedMps: LOOP_M / movingS,
    maxSpeedMps: 12,
    avgHr: 140,
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
    ...overrides,
  };
}

describe('buildRouteGroups', () => {
  it('groups rides of the same loop, ranks them by speed and compares each with the earlier ones', () => {
    const summaries = [
      summary('3', '2026-07-01', 1000, { avgHr: 150 }),
      summary('1', '2026-05-01', 1200),
      summary('2', '2026-06-01', 1500, { avgHr: null }),
      // The same loop the other way round, a loop elsewhere, an indoor ride and a run on the loop.
      summary('4', '2026-06-10', 1200),
      summary('5', '2026-06-11', 1200),
      summary('6', '2026-06-12', 1200, { isIndoor: true }),
      summary('7', '2026-06-13', 1800, { isCycling: false, isRunning: true, sport: 'running' }),
    ];
    const routes = new Map<string, Line>([
      ['1', loop()],
      ['2', loop(20)],
      ['3', loop(-15)],
      ['4', [...loop()].reverse()],
      ['5', loop(600)],
      ['6', loop()],
      ['7', loop()],
    ]);

    const groups = buildRouteGroups(summaries, routes);
    expect(groups).toHaveLength(1);
    const route = groups[0]!;
    expect(() => routeGroupSchema.parse(route)).not.toThrow();
    expect(route).toMatchObject({ id: 'route-1', referenceId: '1', distanceM: LOOP_M });
    expect(route.efforts.map((effort) => [effort.activityId, effort.rank, effort.speedMps])).toEqual([
      ['1', 2, 5],
      ['2', 3, 4],
      ['3', 1, 6],
    ]);
    expect(route.efforts[0]!.change).toBeNull();
    // 4 m/s against 5 m/s; no heart rate on this ride.
    expect(route.efforts[1]!.change).toEqual({ againstCount: 1, speedPct: -20, hrBpm: null });
    // 6 m/s against the median 4.5 m/s; 150 bpm against the one earlier ride with heart rate (140).
    expect(route.efforts[2]!.change).toEqual({ againstCount: 2, speedPct: 33.3, hrBpm: 10 });
  });

  it('compares power only among the efforts ridden with a power meter', () => {
    const powered = (np: number, avgHr: number): Partial<ActivitySummary> => ({
      hasPower: true,
      avgPower: np - 10,
      avgHr,
      metrics: { np, ridingTimeS: 1200, ftpUsed: 200, intensityFactor: np / 200, tss: 20 },
    });
    const summaries = [
      summary('1', '2026-05-01', 1200),
      summary('2', '2026-06-01', 1200, powered(200, 150)),
      summary('3', '2026-07-01', 1200),
      summary('4', '2026-08-01', 1200, powered(210, 150)),
    ];
    const routes = new Map<string, Line>(summaries.map((ride, index) => [ride.id, loop(index * 5)]));

    const [route] = buildRouteGroups(summaries, routes);
    expect(route!.efforts.map((effort) => [effort.activityId, effort.np, effort.avgPower])).toEqual([
      ['1', null, null],
      ['2', 200, 190],
      ['3', null, null],
      ['4', 210, 200],
    ]);
    // No power: nothing. The first powered effort: nothing to compare with yet.
    expect(route!.efforts.slice(0, 3).map((effort) => effort.powerChange)).toEqual([null, null, null]);
    // 210 W against 200 W, both at 150 bpm; speed is still compared with every earlier effort.
    expect(route!.efforts[3]!.powerChange).toEqual({ againstCount: 1, powerPct: 5, hrBpm: 0, efficiencyPct: 5 });
    expect(route!.efforts[3]!.change?.againstCount).toBe(3);
  });

  it('takes distance and moving time from the stream when the ride has them', () => {
    const records = { distanceBestsS: [], maxSpeedMps: null, distanceM: 6100, movingS: 1220 };
    const summaries = [summary('1', '2026-05-01', 1200), summary('2', '2026-06-01', 1500, { records })];
    const routes = new Map<string, Line>([
      ['1', loop()],
      ['2', loop(10)],
    ]);
    const [route] = buildRouteGroups(summaries, routes);
    expect(route!.efforts[1]).toMatchObject({ distanceM: 6100, movingS: 1220, speedMps: 5 });
  });

  it('leaves out routes ridden once and rides without a line or a distance', () => {
    const summaries = [
      summary('1', '2026-05-01', 1200),
      summary('2', '2026-06-01', 1200),
      summary('3', '2026-06-02', 1200, { distanceM: null }),
    ];
    const routes = new Map<string, Line>([
      ['1', loop()],
      ['3', loop()],
    ]);
    expect(buildRouteGroups(summaries, routes)).toEqual([]);
  });
});
