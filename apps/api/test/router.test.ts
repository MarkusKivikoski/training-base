import { mkdtemp, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ACTIVITY_SCHEMA_VERSION,
  createIndexStore,
  createSettingsStore,
  createStreamStore,
  createLoadStore,
  createHeatmapStore,
  createTrendsStore,
  createRecordsStore,
  createClimbsStore,
  createRepeatsStore,
  createGarminCheckStore,
  CLIMBS_SCHEMA_VERSION,
  REPEATS_SCHEMA_VERSION,
  type RouteEffort,
  type WorkoutEffort,
  createSyncStateStore,
  RECORDS_SCHEMA_VERSION,
  type RecordsScope,
  HEATMAP_SCHEMA_VERSION,
  LOAD_SCHEMA_VERSION,
  INDEX_SCHEMA_VERSION,
  STREAM_SCHEMA_VERSION,
  type ActivityId,
  type ActivitySummary,
} from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createIndexCache } from '../src/indexCache.js';
import { appRouter } from '../src/router.js';
import { createSyncJob } from '../src/syncJob.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'training-base-api-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

function activity(id: number, date: string, overrides: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id: String(id),
    name: `Ride ${id}`,
    sport: 'cycling',
    isCycling: true,
    isRunning: false,
    isIndoor: false,
    startTimeLocal: `${date}T08:00:00`,
    startTimeUtc: `${date}T06:00:00.000Z`,
    date,
    durationS: 3600,
    movingDurationS: 3500,
    distanceM: 30000,
    elevationGainM: 200,
    avgSpeedMps: 8,
    maxSpeedMps: 14,
    avgHr: 140,
    maxHr: 170,
    avgCadence: 85,
    maxCadence: 110,
    avgPower: null,
    maxPower: null,
    activeCalories: 600,
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

async function writeIndex(activities: ActivitySummary[]) {
  await createIndexStore(dir).write({
    schemaVersion: INDEX_SCHEMA_VERSION,
    generatedAt: '2026-11-04T12:00:00.000Z',
    activities,
  });
}

function caller(checkIntervalMs = 0) {
  return appRouter.createCaller({
    index: createIndexCache(dir, { checkIntervalMs }),
    settings: createSettingsStore(dir),
    streams: createStreamStore(dir),
    load: createLoadStore(dir),
    heatmap: createHeatmapStore(dir),
    trends: createTrendsStore(dir),
    records: createRecordsStore(dir),
    climbs: createClimbsStore(dir),
    repeats: createRepeatsStore(dir),
    garminCheck: createGarminCheckStore(dir),
    syncState: createSyncStateStore(dir),
    syncJob: createSyncJob({ spawner: () => ({ onLine: () => {}, onExit: () => {} }) }),
    today: () => '2026-11-04',
  });
}

describe('activities.list', () => {
  beforeEach(() =>
    writeIndex([
      activity(5, '2026-11-04'),
      activity(4, '2026-11-03', { sport: 'strength_training', isCycling: false, isIndoor: true }),
      activity(3, '2026-11-01', { sport: 'indoor_cycling', isIndoor: true }),
      activity(2, '2026-10-20'),
      activity(1, '2026-10-01'),
    ]),
  );

  it('returns cycling only by default, newest first', async () => {
    const r = await caller().activities.list({});
    expect(r.items.map((a) => a.id)).toEqual(['5', '3', '2', '1']);
    expect(r.total).toBe(4);
    expect(r.nextCursor).toBeNull();
  });

  it('includes other sports with sport "all"', async () => {
    expect((await caller().activities.list({ sport: 'all' })).total).toBe(5);
  });

  it('searches names and filters by type, environment, distance and power', async () => {
    const list = (o: Parameters<ReturnType<typeof caller>['activities']['list']>[0]) =>
      caller()
        .activities.list(o)
        .then((r) => r.items.map((a) => a.id));
    expect(await list({ sport: 'all', q: 'RIDE 3' })).toEqual(['3']);
    expect(await list({ sport: 'all', types: ['strength_training'] })).toEqual(['4']);
    expect(await list({ environment: 'indoor' })).toEqual(['3']);
    expect(await list({ environment: 'outdoor' })).toEqual(['5', '2', '1']);
    expect(await list({ minKm: 1000 })).toEqual([]);
    expect(await list({ hasPower: true })).toEqual([]); // no fixture ride has power
    const r = await caller().activities.list({ sport: 'all' });
    expect(r.types).toEqual([
      { type: 'cycling', count: 3 },
      { type: 'indoor_cycling', count: 1 },
      { type: 'strength_training', count: 1 },
    ]);
  });

  it('filters by inclusive date range', async () => {
    const r = await caller().activities.list({ from: '2026-10-20', to: '2026-11-01' });
    expect(r.items.map((a) => a.id)).toEqual(['3', '2']);
  });

  it('sorts the whole filtered list by a column, empty values last', async () => {
    await writeIndex([
      activity(5, '2026-11-04', { distanceM: 20000, avgHr: null }),
      activity(3, '2026-11-01', { distanceM: 50000, avgHr: 150 }),
      activity(2, '2026-10-20', { distanceM: 40000, avgHr: 130 }),
      activity(1, '2025-10-01', { distanceM: 90000, avgHr: 160 }),
      activity(6, '2025-09-01', { distanceM: 0, isIndoor: true }),
    ]);
    const ids = (o: Parameters<ReturnType<typeof caller>['activities']['list']>[0]) =>
      caller()
        .activities.list(o)
        .then((r) => r.items.map((a) => a.id));
    expect(await ids({ sort: 'distance' })).toEqual(['1', '3', '2', '5', '6']);
    expect(await ids({ sort: 'distance', order: 'asc' })).toEqual(['5', '2', '3', '1', '6']); // 0 m counts as none
    expect(await ids({ sort: 'hr', order: 'asc' })).toEqual(['2', '6', '3', '1', '5']);
    expect(await ids({ sort: 'hr' })).toEqual(['1', '3', '6', '2', '5']);
    expect(await ids({ sort: 'date', order: 'asc' })).toEqual(['6', '1', '2', '3', '5']);
    // Within a year range, and paged after sorting.
    expect(await ids({ sort: 'distance', from: '2026-01-01', to: '2026-12-31' })).toEqual(['3', '2', '5']);
    expect(await ids({ sort: 'distance', limit: 2, cursor: 2 })).toEqual(['2', '5']);
  });

  it('pages with a cursor', async () => {
    const first = await caller().activities.list({ limit: 3 });
    expect(first.items.map((a) => a.id)).toEqual(['5', '3', '2']);
    expect(first.nextCursor).toBe(3);
    const second = await caller().activities.list({ limit: 3, cursor: 3 });
    expect(second.items.map((a) => a.id)).toEqual(['1']);
    expect(second.nextCursor).toBeNull();
  });
});

describe('activities.get', () => {
  it('returns one activity or NOT_FOUND', async () => {
    await writeIndex([activity(7, '2026-11-04')]);
    expect((await caller().activities.get({ id: '7' })).name).toBe('Ride 7');
    await expect(caller().activities.get({ id: '8' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects non-numeric IDs', async () => {
    await expect(caller().activities.get({ id: '../x' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('settings.current', () => {
  it('returns the FTP and weight in effect today', async () => {
    const s = createSettingsStore(dir);
    await s.upsertFtp({ from: '2026-01-01', watts: 180, source: 'manual' });
    await s.upsertFtp({ from: '2026-10-15', watts: 199, source: 'manual' });
    await s.upsertFtp({ from: '2026-12-01', watts: 210, source: 'manual' });
    const r = await caller().settings.current();
    expect(r.ftp?.watts).toBe(199);
    expect(r.weight).toBeNull();
  });
});

describe('index cache', () => {
  it('serves an empty index when index.json is missing', async () => {
    expect((await caller().status()).activityCount).toBe(0);
  });

  it('reloads after index.json changes', async () => {
    await writeIndex([activity(1, '2026-11-01')]);
    const c = caller();
    expect((await c.status()).activityCount).toBe(1);

    await writeIndex([activity(2, '2026-11-02'), activity(1, '2026-11-01')]);
    // Some filesystems have coarse mtimes; force a visible change.
    const later = new Date(Date.now() + 5000);
    await utimes(createIndexStore(dir).file, later, later);
    expect((await c.status()).activityCount).toBe(2);
  });
});

describe('activities.streams', () => {
  it('returns stored streams or NOT_FOUND', async () => {
    const stream = {
      schemaVersion: STREAM_SCHEMA_VERSION,
      time: [0, 1, 2],
      power: [100, 110, null],
      hr: [120, 121, 122],
      cadence: null,
      speed: null,
      altitude: null,
      distance: null,
      lat: null,
      lng: null,
      laps: null,
    };
    await createStreamStore(dir).write('7' as ActivityId, stream);
    expect(await caller().activities.streams({ id: '7' })).toEqual(stream);
    await expect(caller().activities.streams({ id: '8' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('activities.meanMax', () => {
  it('returns curves of powered rides in the date range, any sport', async () => {
    await writeIndex([
      activity(3, '2026-11-03', { meanMaxPower: [500, 400] }),
      activity(2, '2026-10-20'),
      activity(1, '2026-09-01', { meanMaxPower: [600, 450] }),
    ]);
    const all = await caller().activities.meanMax({});
    expect(all.map((r) => r.id)).toEqual(['3', '1']);
    expect(all[0]).toEqual({
      id: '3',
      date: '2026-11-03',
      name: 'Ride 3',
      meanMaxPower: [500, 400],
      lthrEstimate: null,
    });
    expect((await caller().activities.meanMax({ from: '2026-10-01' })).map((r) => r.id)).toEqual(['3']);
  });
});

describe('load.daily', () => {
  it('returns stored days, filtered by date, and an empty list without a file', async () => {
    expect((await caller().load.daily({})).days).toEqual([]);
    const days = [
      { date: '2026-11-01', tss: 100, ctl: 2.4, atl: 14.3, tsb: 0 },
      { date: '2026-11-02', tss: 0, ctl: 2.3, atl: 12.2, tsb: -11.9 },
    ];
    await createLoadStore(dir).write({
      schemaVersion: LOAD_SCHEMA_VERSION,
      generatedAt: '2026-11-05T00:00:00.000Z',
      days,
      allActivities: days,
    });
    expect((await caller().load.daily({})).days).toEqual(days);
    expect((await caller().load.daily({ from: '2026-11-02' })).days).toEqual([days[1]]);
    expect((await caller().load.daily({ from: '2026-11-02' })).allActivities).toEqual([days[1]]);
  });
});

describe('settings.current LTHR', () => {
  it('returns the LTHR in effect and the history', async () => {
    await createSettingsStore(dir).upsertLthr({ from: '2026-10-27', bpm: 155, source: 'estimated' });
    const r = await caller().settings.current();
    expect(r.lthr?.bpm).toBe(155);
    expect(r.lthrHistory).toHaveLength(1);
  });
});

describe('heatmap.routes', () => {
  it('filters routes by year and sport and lists the filter options', async () => {
    expect(await caller().heatmap.routes({})).toMatchObject({ routes: [], years: [], sports: [] });
    const route = (id: string, date: string, sport: string) => ({
      id,
      date,
      sport,
      discipline: sport === 'running' ? ('running' as const) : ('cycling' as const),
      points: [
        [24.9, 60.1],
        [24.95, 60.2],
      ] as [number, number][],
    });
    await createHeatmapStore(dir).write({
      schemaVersion: HEATMAP_SCHEMA_VERSION,
      generatedAt: '2026-11-05T00:00:00.000Z',
      trimM: 200,
      routes: [
        route('1', '2025-06-01', 'cycling'),
        route('2', '2026-10-06', 'gravel_cycling'),
        route('3', '2026-10-21', 'cycling'),
        route('4', '2024-08-01', 'running'),
      ],
    });
    const all = await caller().heatmap.routes({});
    expect(all).toMatchObject({ trimM: 200, years: [2026, 2025], sports: ['cycling', 'gravel_cycling'] });
    expect(all.routes.map((r) => r.id)).toEqual(['1', '2', '3']);
    expect((await caller().heatmap.routes({ year: 2026 })).routes.map((r) => r.id)).toEqual(['2', '3']);
    expect((await caller().heatmap.routes({ year: 2026, sports: ['cycling'] })).routes.map((r) => r.id)).toEqual(['3']);
    expect((await caller().heatmap.routes({ sports: [] })).routes).toHaveLength(3);
    // Date range, inclusive at both ends; either bound alone works too.
    expect((await caller().heatmap.routes({ from: '2025-06-01', to: '2026-10-06' })).routes.map((r) => r.id)).toEqual([
      '1',
      '2',
    ]);
    expect((await caller().heatmap.routes({ from: '2026-10-07' })).routes.map((r) => r.id)).toEqual(['3']);
    // Rides are the default; runs and both are a choice, each with its own years and types.
    const runs = await caller().heatmap.routes({ discipline: 'running' });
    expect(runs).toMatchObject({ years: [2024], sports: ['running'] });
    expect(runs.routes.map((r) => r.id)).toEqual(['4']);
    const both = await caller().heatmap.routes({ discipline: 'all' });
    expect(both.years).toEqual([2026, 2025, 2024]);
    expect(both.routes.map((r) => r.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('trends.get', () => {
  it('returns an empty file before the first rebuild', async () => {
    const t = await caller().trends.get();
    expect(t).toMatchObject({ months: [], years: [], rides: [] });
  });
});

describe('records.get', () => {
  it('returns no scope before the first rebuild', async () => {
    expect(await caller().records.get({})).toMatchObject({ years: [], scope: null });
    expect((await caller().records.get({ year: 2026 })).scope).toBeNull();
  });
});

describe('records.forActivity', () => {
  const emptyScope = (): RecordsScope => ({
    efforts: [],
    maxSpeed: [],
    longestDistance: [],
    longestTime: [],
    power: [],
    periods: {
      week: { hours: [], distanceKm: [], elevationM: [], rides: [] },
      month: { hours: [], distanceKm: [], elevationM: [], rides: [] },
      year: null,
    },
    highs: { elevation: [], avgSpeed: [], maxHr: [], hilliest: [], earliestStart: [] },
    climbs: { longest: [], biggestGain: [] },
    breaks: [],
    firstRides: [],
    streaks: { days: null, weeks: null },
  });
  const e = (id: string, value: number, extra?: number) => ({
    id,
    name: `Ride ${id}`,
    date: '2025-06-01',
    value,
    ...(extra ? { extra } : {}),
  });

  it('lists the places a ride holds in every scope, and nothing for other rides', async () => {
    const all = emptyScope();
    all.efforts = [{ distanceM: 10000, top: [e('9', 1100, 9.09), e('7', 1150, 8.7)] }];
    all.maxSpeed = [e('7', 16.6)];
    const y2025 = emptyScope();
    y2025.efforts = [{ distanceM: 10000, top: [e('7', 1150, 8.7)] }];
    y2025.power = [{ durationS: 300, top: [e('1', 300), e('7', 280)] }];
    const runsAll = emptyScope();
    runsAll.efforts = [{ distanceM: 5000, top: [e('20', 1500, 3.33)] }];
    await createRecordsStore(dir).write({
      schemaVersion: RECORDS_SCHEMA_VERSION,
      generatedAt: '2026-11-06T00:00:00.000Z',
      today: '2026-11-06',
      disciplines: {
        cycling: { years: [2025], scopes: { all, '2025': y2025 } },
        running: { years: [2026], scopes: { all: runsAll, '2026': runsAll } },
      },
    });

    const places = await caller().records.forActivity({ id: '7' });
    expect(places).toEqual([
      { scope: 'all', kind: 'effort', key: 10000, rank: 2, value: 1150, extra: 8.7 },
      { scope: 'all', kind: 'maxSpeed', rank: 1, value: 16.6 },
      { scope: '2025', kind: 'effort', key: 10000, rank: 1, value: 1150, extra: 8.7 },
      { scope: '2025', kind: 'power', key: 300, rank: 2, value: 280 },
    ]);
    expect(await caller().records.forActivity({ id: '8' })).toEqual([]);

    // A run's places come from the run records; rides are the default for records.get.
    expect(await caller().records.forActivity({ id: '20' })).toEqual([
      { scope: 'all', kind: 'effort', key: 5000, rank: 1, value: 1500, extra: 3.33 },
      { scope: '2026', kind: 'effort', key: 5000, rank: 1, value: 1500, extra: 3.33 },
    ]);
    expect((await caller().records.get({})).years).toEqual([2025]);
    const runRecords = await caller().records.get({ discipline: 'running' });
    expect(runRecords.years).toEqual([2026]);
    expect(runRecords.scope?.efforts[0]?.distanceM).toBe(5000);
  });
});

describe('goals', () => {
  it('starts empty, saves and replaces goals, and rejects duplicate ids', async () => {
    expect(await caller().goals.list()).toEqual([]);
    const goals = [
      { id: 'a', metric: 'distance' as const, period: 'year' as const, target: 3000 },
      { id: 'b', metric: 'time' as const, period: 'week' as const, target: 6 },
    ];
    await caller().goals.save({ goals });
    expect(await caller().goals.list()).toEqual(goals);
    await caller().goals.save({ goals: [goals[1]!] });
    expect(await caller().goals.list()).toEqual([goals[1]]);
    await expect(caller().goals.save({ goals: [goals[0]!, goals[0]!] })).rejects.toThrow(/unique/);
  });
});

describe('climbs', () => {
  const effort = (activityId: string, date: string, timeS: number, rank: number, startS = 100) => ({
    activityId,
    date,
    name: `Ride ${activityId}`,
    startS,
    timeS,
    avgPower: null,
    avgHr: 150,
    rank,
  });
  beforeEach(() =>
    createClimbsStore(dir).write({
      schemaVersion: CLIMBS_SCHEMA_VERSION,
      generatedAt: '2026-11-06T00:00:00.000Z',
      climbs: [
        {
          id: '1-0',
          lengthM: 500,
          gainM: 30,
          avgGrade: 0.06,
          maxGrade: 0.08,
          score: 3000,
          start: [25, 60],
          end: [25, 60.0045],
          path: [
            [25, 60],
            [25, 60.0045],
          ],
          profile: [
            [0, 20],
            [500, 50],
          ],
          efforts: [
            effort('1', '2025-05-01', 120, 2, 900),
            effort('2', '2025-06-01', 110, 1),
            effort('2', '2025-06-01', 130, 3, 600),
          ],
        },
        {
          id: '2-0',
          lengthM: 300,
          gainM: 15,
          avgGrade: 0.05,
          maxGrade: 0.05,
          score: 1500,
          start: [25.1, 60],
          end: [25.1, 60.003],
          path: [],
          profile: [],
          efforts: [effort('2', '2025-06-01', 80, 1, 300)],
        },
      ],
    }),
  );

  it('lists climbs with ride counts, best effort and names', async () => {
    await caller().climbs.rename({ id: '1-0', name: '  Kirkkomäki ' });
    const { climbs } = await caller().climbs.list();
    expect(climbs[0]).toMatchObject({
      id: '1-0',
      name: 'Kirkkomäki',
      rides: 2,
      efforts: 3,
      best: { timeS: 110, activityId: '2' },
      firstDate: '2025-05-01',
      lastDate: '2025-06-01',
    });
    expect(climbs[1]).toMatchObject({ id: '2-0', name: null, rides: 1 });
    await caller().climbs.rename({ id: '1-0', name: '' });
    expect((await caller().climbs.get({ id: '1-0' })).name).toBeNull();
  });

  it("returns a ride's climbs in ride order with only its own efforts", async () => {
    const mine = await caller().climbs.forActivity({ id: '2' });
    expect(mine.map((x) => x.climb.id)).toEqual(['1-0', '2-0']);
    expect(mine[0]!.efforts.map((e) => e.rank)).toEqual([1, 3]);
    expect(await caller().climbs.forActivity({ id: '9' })).toEqual([]);
    await expect(caller().climbs.get({ id: '9-9' })).rejects.toThrow(/not found/);
  });
});

describe('repeats', () => {
  const effort = (activityId: string, date: string, overrides: Partial<WorkoutEffort> = {}): WorkoutEffort => ({
    activityId,
    date,
    offsetS: 0,
    difference: 0,
    isManual: false,
    durationS: 3600,
    avgPower: 150,
    np: 160,
    avgHr: 140,
    decouplingPercent: null,
    blocks: [],
    work: null,
    change: null,
    ...overrides,
  });
  const routeEffort = (activityId: string, date: string, rank: number, change: RouteEffort['change'] = null) => ({
    activityId,
    date,
    distanceM: 37100,
    movingS: 5300,
    speedMps: 7,
    avgHr: 140,
    avgPower: null,
    np: null,
    rank,
    change,
    powerChange: null,
  });
  beforeEach(() =>
    createRepeatsStore(dir).write({
      schemaVersion: REPEATS_SCHEMA_VERSION,
      generatedAt: '2026-11-16T00:00:00.000Z',
      workouts: [
        {
          id: 'workout-1',
          referenceId: '1',
          durationS: 3600,
          blocks: [{ startS: 600, endS: 840 }],
          efforts: [effort('1', '2026-10-28'), effort('3', '2026-11-11', { offsetS: 10, difference: 0.041 })],
        },
        { id: 'workout-2', referenceId: '2', durationS: 5400, blocks: [], efforts: [effort('2', '2026-11-02')] },
      ],
      routes: [
        {
          id: 'route-5',
          referenceId: '5',
          distanceM: 37100,
          efforts: [
            routeEffort('5', '2026-05-01', 2),
            routeEffort('6', '2026-06-01', 1, { againstCount: 1, speedPct: 4.2, hrBpm: -3 }),
          ],
        },
      ],
    }),
  );

  it("returns a ride's workout with its name and effort ratings, and null for other rides", async () => {
    const c = caller();
    await c.notes.save({ id: '3', rpe: 6, note: '' });
    await c.repeats.rename({ id: 'workout-1', name: '  Endurance steps ' });
    const workout = await c.repeats.workoutForActivity({ id: '3' });
    expect(workout).toMatchObject({ id: 'workout-1', name: 'Endurance steps', ratings: { '3': 6 } });
    expect(workout?.efforts.map((e) => e.activityId)).toEqual(['1', '3']);
    expect(await c.repeats.workoutForActivity({ id: '9' })).toBeNull();
    await c.repeats.rename({ id: 'workout-1', name: '' });
    expect((await c.repeats.workoutForActivity({ id: '3' }))?.name).toBeNull();
  });

  it("returns an outdoor ride's repeated route with its name and ratings, and null for other rides", async () => {
    const c = caller();
    await c.notes.save({ id: '6', rpe: 4, note: '' });
    await c.repeats.rename({ id: 'route-5', name: 'Evening loop' });
    const route = await c.repeats.routeForActivity({ id: '6' });
    expect(route).toMatchObject({ id: 'route-5', name: 'Evening loop', distanceM: 37100, ratings: { '6': 4 } });
    expect(route?.efforts.map((e) => [e.activityId, e.rank])).toEqual([
      ['5', 2],
      ['6', 1],
    ]);
    expect(await c.repeats.routeForActivity({ id: '1' })).toBeNull();
    expect(await c.repeats.workoutForActivity({ id: '6' })).toBeNull();
  });

  it('lists every workout for placing a ride by hand', async () => {
    expect(await caller().repeats.workouts()).toEqual([
      {
        id: 'workout-1',
        name: null,
        referenceId: '1',
        durationS: 3600,
        blocks: [{ startS: 600, endS: 840 }],
        efforts: 2,
        firstDate: '2026-10-28',
        lastDate: '2026-11-11',
      },
      {
        id: 'workout-2',
        name: null,
        referenceId: '2',
        durationS: 5400,
        blocks: [],
        efforts: 1,
        firstDate: '2026-11-02',
        lastDate: '2026-11-02',
      },
    ]);
  });

  it('places a ride by hand, starts a rebuild, and clears the placement again', async () => {
    const c = caller();
    expect(await c.repeats.place({ activityId: '2', workout: 'workout-1' })).toMatchObject({
      state: 'running',
      kind: 'rebuild',
    });
    await c.repeats.place({ activityId: '3', workout: 'own' });
    expect((await createSettingsStore(dir).readRideGroups()).workoutOverrides).toEqual({
      '2': 'workout-1',
      '3': 'own',
    });
    await c.repeats.place({ activityId: '3', workout: null });
    expect((await createSettingsStore(dir).readRideGroups()).workoutOverrides).toEqual({ '2': 'workout-1' });
  });

  it('rejects rides without a workout, unknown workouts, and moving the ride that defines a workout', async () => {
    const c = caller();
    await expect(c.repeats.place({ activityId: '9', workout: 'own' })).rejects.toThrow(/indoor rides with power/);
    await expect(c.repeats.place({ activityId: '2', workout: 'workout-9' })).rejects.toThrow(/doesn’t exist/);
    await expect(c.repeats.place({ activityId: '1', workout: 'workout-2' })).rejects.toThrow(/defines its workout/);
    await expect(c.repeats.place({ activityId: '1', workout: 'own' })).rejects.toThrow(/defines its workout/);
    await expect(c.repeats.rename({ id: 'climb-1', name: 'x' })).rejects.toThrow();
    expect((await c.sync.status()).state).not.toBe('running');
  });
});

describe('settingsEdit', () => {
  it('adds, replaces and removes dated entries, saves the privacy trim, and starts a rebuild each time', async () => {
    const c = caller();
    const first = await c.settingsEdit.save({
      kind: 'ftp',
      entry: { from: '2026-10-27', watts: 199, source: 'manual' },
    });
    expect(first).toMatchObject({ state: 'running', kind: 'rebuild' });
    await c.settingsEdit.save({ kind: 'weight', entry: { from: '2026-11-04', kg: 85 } });
    await c.settingsEdit.save({ kind: 'lthr', entry: { from: '2026-10-27', bpm: 155, source: 'estimated' } });
    await c.settingsEdit.save({ kind: 'ftp', entry: { from: '2026-10-27', watts: 205, source: 'manual' } });
    await c.settingsEdit.privacyTrim({ metres: 300 });
    let s = await c.settings.current();
    expect(s.ftpHistory).toEqual([{ from: '2026-10-27', watts: 205, source: 'manual' }]);
    expect(s.weightHistory).toHaveLength(1);
    expect(s.lthrHistory[0]).toMatchObject({ bpm: 155 });
    expect(s.privacyTrimM).toBe(300);
    await c.settingsEdit.remove({ kind: 'weight', from: '2026-11-04' });
    s = await c.settings.current();
    expect(s.weightHistory).toEqual([]);
  });

  it('remembers declined FTP suggestions without starting a rebuild', async () => {
    const c = caller();
    expect((await c.settings.current()).dismissedFtpRides).toEqual([]);
    expect(await c.settingsEdit.dismissFtpSuggestion({ activityId: '12' })).toEqual({ dismissedFtpRides: ['12'] });
    await c.settingsEdit.dismissFtpSuggestion({ activityId: '12' });
    await c.settingsEdit.dismissFtpSuggestion({ activityId: '34' });
    expect((await c.settings.current()).dismissedFtpRides).toEqual(['12', '34']);
    expect((await c.sync.status()).state).not.toBe('running');
    await expect(c.settingsEdit.dismissFtpSuggestion({ activityId: '../x' })).rejects.toThrow();
    await c.settingsEdit.dismissLthrSuggestion({ activityId: '56' });
    expect((await c.settings.current()).dismissedLthrRides).toEqual(['56']);
    expect((await c.settings.current()).dismissedFtpRides).toEqual(['12', '34']);
  });

  it('rejects future dates and out-of-range values', async () => {
    const c = caller();
    await expect(
      c.settingsEdit.save({ kind: 'ftp', entry: { from: '2026-12-01', watts: 200, source: 'manual' } }),
    ).rejects.toThrow(/future/);
    await expect(
      c.settingsEdit.save({ kind: 'lthr', entry: { from: '2026-10-01', bpm: 300, source: 'manual' } }),
    ).rejects.toThrow();
    await expect(c.settingsEdit.save({ kind: 'weight', entry: { from: '2026-10-01', kg: 5 } })).rejects.toThrow();
  });
});

describe('gear', () => {
  it('adds bikes and components, overrides a ride, and removes a bike with what hangs off it', async () => {
    const c = caller();
    expect(await c.gear.get()).toMatchObject({ bikes: [], components: [], overrides: {} });
    await c.gear.saveBike({ id: 'road', name: 'Road bike', types: ['road_biking'], retired: false });
    await c.gear.saveBike({ id: 'gravel', name: 'Gravel bike', types: ['gravel_cycling'], retired: false });
    let gear = await c.gear.saveBike({ id: 'road', name: 'Canyon', types: ['road_biking', 'cycling'], retired: false });
    expect(gear.bikes.map((b) => [b.id, b.name])).toEqual([
      ['road', 'Canyon'],
      ['gravel', 'Gravel bike'],
    ]);
    await c.gear.saveComponent({
      id: 'chain',
      bikeId: 'road',
      name: 'Chain',
      installedOn: '2026-06-01',
      intervalKm: 3000,
    });
    await expect(
      c.gear.saveComponent({ id: 'x', bikeId: 'nope', name: 'Chain', installedOn: '2026-06-01' }),
    ).rejects.toThrow(/doesn’t exist/);
    await c.gear.setRideBike({ activityId: '12', bikeId: 'road' });
    gear = await c.gear.setRideBike({ activityId: '13', bikeId: 'none' });
    expect(gear.overrides).toEqual({ '12': 'road', '13': 'none' });
    gear = await c.gear.setRideBike({ activityId: '13', bikeId: null });
    expect(gear.overrides).toEqual({ '12': 'road' });
    gear = await c.gear.removeBike({ id: 'road' });
    expect(gear.bikes.map((b) => b.id)).toEqual(['gravel']);
    expect(gear.components).toEqual([]);
    expect(gear.overrides).toEqual({});
  });
});

describe('tyres', () => {
  it('starts with road and gravel tyres, and adds, renames and removes tyres with their ride tags', async () => {
    const c = caller();
    expect((await c.gear.get()).tyres).toEqual([
      { id: 'road', name: 'Road' },
      { id: 'gravel', name: 'Gravel' },
    ]);
    await c.tyres.save({ id: 'studded', name: ' Studded ' });
    let gear = await c.tyres.save({ id: 'road', name: 'Road 32 mm' });
    expect(gear.tyres).toEqual([
      { id: 'road', name: 'Road 32 mm' },
      { id: 'gravel', name: 'Gravel' },
      { id: 'studded', name: 'Studded' },
    ]);

    await c.tyres.setForRide({ activityId: '12', tyreId: 'gravel' });
    await c.tyres.setForRide({ activityId: '13', tyreId: 'road' });
    gear = await c.tyres.setForRide({ activityId: '14', tyreId: 'gravel' });
    expect(gear.rideTyres).toEqual({ '12': 'gravel', '13': 'road', '14': 'gravel' });
    gear = await c.tyres.setForRide({ activityId: '14', tyreId: null });
    expect(gear.rideTyres).toEqual({ '12': 'gravel', '13': 'road' });
    await expect(c.tyres.setForRide({ activityId: '15', tyreId: 'slicks' })).rejects.toThrow(/don’t exist/);

    gear = await c.tyres.remove({ id: 'gravel' });
    expect(gear.tyres.map((tyre) => tyre.id)).toEqual(['road', 'studded']);
    expect(gear.rideTyres).toEqual({ '13': 'road' });
    // Bikes and their ride overrides are untouched.
    expect(gear).toMatchObject({ bikes: [], overrides: {} });
  });

  it('keeps the list empty once every set of tyres is removed', async () => {
    const c = caller();
    await c.tyres.remove({ id: 'road' });
    await c.tyres.remove({ id: 'gravel' });
    expect((await c.gear.get()).tyres).toEqual([]);
  });
});

describe('notes', () => {
  it('saves, replaces and removes how an activity felt', async () => {
    const c = caller();
    expect(await c.notes.forActivity({ id: '12' })).toBeNull();
    expect(await c.notes.save({ id: '12', rpe: 7, note: '  Windy, legs heavy ' })).toEqual({
      rpe: 7,
      note: 'Windy, legs heavy',
    });
    expect(await c.notes.save({ id: '12', rpe: null, note: 'Just a note' })).toEqual({ note: 'Just a note' });
    expect(await c.notes.save({ id: '12', rpe: null, note: ' ' })).toBeNull();
    expect(await c.notes.forActivity({ id: '12' })).toBeNull();
    await expect(c.notes.save({ id: '12', rpe: 11, note: '' })).rejects.toThrow();
  });
});

describe('workoutTypes', () => {
  beforeEach(() =>
    writeIndex([
      activity(2, '2026-11-03', { workoutType: { type: 'endurance', basis: 'power', reps: null } }),
      activity(1, '2026-11-01'),
    ]),
  );

  it('serves the type set by hand next to the detected one, until it is cleared', async () => {
    const c = caller();
    expect((await c.activities.get({ id: '2' })).workoutTypeOverride).toBeNull();

    await c.workoutTypes.set({ id: '2', type: 'threshold' });
    const ride = await c.activities.get({ id: '2' });
    expect(ride.workoutTypeOverride).toBe('threshold');
    expect(ride.workoutType?.type).toBe('endurance');
    const listed = (await c.activities.list({})).items.map((a) => [a.id, a.workoutTypeOverride]);
    expect(listed).toEqual([
      ['2', 'threshold'],
      ['1', null],
    ]);

    await c.workoutTypes.set({ id: '2', type: null });
    expect((await c.activities.get({ id: '2' })).workoutTypeOverride).toBeNull();
    await expect(c.workoutTypes.set({ id: '2', type: 'zone2' as never })).rejects.toThrow();
  });
});

describe('intervals', () => {
  it('stores a ride’s intervals set by hand, including none, until it goes back to detection', async () => {
    const c = caller();
    expect(await c.intervals.forActivity({ id: '7' })).toBeNull();

    const intervals = [
      { startS: 60, endS: 360 },
      { startS: 480, endS: 780 },
    ];
    expect(await c.intervals.set({ id: '7', intervals })).toEqual(intervals);
    expect(await c.intervals.forActivity({ id: '7' })).toEqual(intervals);
    expect(await c.intervals.forActivity({ id: '8' })).toBeNull();

    await c.intervals.set({ id: '7', intervals: [] });
    expect(await c.intervals.forActivity({ id: '7' })).toEqual([]);

    await c.intervals.set({ id: '7', intervals: null });
    expect(await c.intervals.forActivity({ id: '7' })).toBeNull();
  });

  it('rejects intervals that overlap, are out of order or end before they start', async () => {
    const c = caller();
    const overlapping = [
      { startS: 60, endS: 400 },
      { startS: 300, endS: 600 },
    ];
    const outOfOrder = [
      { startS: 500, endS: 600 },
      { startS: 60, endS: 120 },
    ];
    await expect(c.intervals.set({ id: '7', intervals: overlapping })).rejects.toThrow(/overlap/);
    await expect(c.intervals.set({ id: '7', intervals: outOfOrder })).rejects.toThrow(/order/);
    await expect(c.intervals.set({ id: '7', intervals: [{ startS: 90, endS: 90 }] })).rejects.toThrow();
    await expect(c.intervals.set({ id: '7', intervals: [{ startS: 1.5, endS: 90 }] })).rejects.toThrow();
    expect(await c.intervals.forActivity({ id: '7' })).toBeNull();
  });
});

describe('plan', () => {
  it('starts empty with default presets, then adds, replaces and removes sessions', async () => {
    const c = caller();
    expect(await c.plan.get()).toMatchObject({ presets: { easy: 40, medium: 70, hard: 100 }, sessions: [] });
    await c.plan.saveSession({ id: 'b', date: '2026-11-14', title: 'Long ride', intensity: 'hard' });
    await c.plan.saveSession({ id: 'a', date: '2026-11-12', title: 'Spin', intensity: 'custom', tss: 35 });
    let plan = await c.plan.saveSession({ id: 'b', date: '2026-11-15', title: 'Long ride', intensity: 'medium' });
    expect(plan.sessions.map((s) => [s.id, s.date, s.intensity])).toEqual([
      ['a', '2026-11-12', 'custom'],
      ['b', '2026-11-15', 'medium'],
    ]);
    plan = await c.plan.removeSession({ id: 'a' });
    expect(plan.sessions.map((s) => s.id)).toEqual(['b']);
    plan = await c.plan.setPresets({ easy: 30, medium: 60, hard: 110 });
    expect(plan.presets).toEqual({ easy: 30, medium: 60, hard: 110 });
    expect(plan.sessions).toHaveLength(1);
  });

  it('adds, replaces and removes target events next to the sessions', async () => {
    const c = caller();
    await c.plan.saveSession({ id: 's', date: '2026-11-12', title: 'Spin', intensity: 'easy' });
    await c.plan.saveEvent({ id: 'b', date: '2027-06-14', name: 'Kalevan kierros' });
    let plan = await c.plan.saveEvent({ id: 'a', date: '2027-05-01', name: 'Spring century' });
    expect(plan.events.map((e) => e.id)).toEqual(['a', 'b']);
    plan = await c.plan.saveEvent({ id: 'a', date: '2027-08-01', name: 'Late century' });
    expect(plan.events.map((e) => [e.id, e.date])).toEqual([
      ['b', '2027-06-14'],
      ['a', '2027-08-01'],
    ]);
    plan = await c.plan.removeEvent({ id: 'b' });
    expect(plan.events.map((e) => e.id)).toEqual(['a']);
    expect(plan.sessions).toHaveLength(1);
    await expect(c.plan.saveEvent({ id: 'x', date: '2027-05-01', name: ' ' })).rejects.toThrow();
  });

  it('rejects a custom session without a TSS and bad ids', async () => {
    const c = caller();
    await expect(
      c.plan.saveSession({ id: 'x', date: '2026-11-12', title: 'Spin', intensity: 'custom' }),
    ).rejects.toThrow();
    await expect(
      c.plan.saveSession({ id: '../x', date: '2026-11-12', title: 'Spin', intensity: 'easy' }),
    ).rejects.toThrow();
  });
});

describe('garmin.deletedCheck', () => {
  it('reports no check before the first run, then the saved result', async () => {
    expect(await caller().garmin.deletedCheck()).toMatchObject({ checkedAt: null, missing: [] });
    const result = {
      schemaVersion: 1 as const,
      checkedAt: '2026-11-08T10:00:00.000Z',
      from: '2021-11-05',
      to: '2026-11-08',
      missing: [{ id: '7', date: '2025-06-01', name: 'Ride 7' }],
      quarantined: [],
    };
    await createGarminCheckStore(dir).write(result);
    expect(await caller().garmin.deletedCheck()).toEqual(result);
  });
});

describe('sync', () => {
  it('reports idle with the last sync time before any run', async () => {
    expect(await caller().sync.status()).toMatchObject({ state: 'idle', lastSyncAt: null });
    expect((await caller().sync.start()).state).toBe('running');
  });
});

describe('rideMerges', () => {
  const at = (time: string) => ({ startTimeUtc: `2026-11-03T${time}.000Z`, startTimeLocal: `2026-11-03T${time}` });
  beforeEach(() =>
    writeIndex([
      activity(5, '2026-11-04'),
      activity(4, '2026-11-03', { ...at('07:30:00'), isIndoor: true, sport: 'indoor_cycling' }),
      activity(3, '2026-11-03', { ...at('07:20:00') }),
      activity(2, '2026-11-03', { ...at('06:30:00') }), // overlaps ride 1
      activity(1, '2026-11-03', { ...at('06:00:00') }),
    ]),
  );

  it('lists rides just before or after this one, of the same kind and not overlapping', async () => {
    const candidates = await caller().rideMerges.candidates({ id: '1' });
    expect(candidates.map((c) => [c.id, c.gapS, c.isBefore])).toEqual([['3', 1200, false]]);
  });

  it('saves a merge earliest first, and splits it again', async () => {
    const c = caller();
    await c.rideMerges.merge({ ids: ['3', '1'] });
    expect(await createSettingsStore(dir).readRideMerges()).toEqual([['1', '3']]);

    await c.rideMerges.split({ id: '1' });
    expect(await createSettingsStore(dir).readRideMerges()).toEqual([]);
    await expect(c.rideMerges.split({ id: '1' })).rejects.toThrow(/isn’t merged/);
  });

  it('brings a merged ride’s recordings along when it is merged again', async () => {
    await writeIndex([
      activity(9, '2026-11-03', { ...at('09:00:00') }),
      activity(1, '2026-11-03', {
        ...at('06:00:00'),
        mergedFrom: [
          { id: '1', startS: 0, durationS: 3600 },
          { id: '3', startS: 4800, durationS: 3600 },
        ],
      }),
    ]);
    await createSettingsStore(dir).writeRideMerges([['1', '3']]);
    await caller().rideMerges.merge({ ids: ['1', '9'] });
    expect(await createSettingsStore(dir).readRideMerges()).toEqual([['1', '3', '9']]);
  });

  it('refuses rides that overlap, are of different kinds, or are far apart', async () => {
    const c = caller();
    await expect(c.rideMerges.merge({ ids: ['1', '2'] })).rejects.toThrow(/overlap/);
    await expect(c.rideMerges.merge({ ids: ['3', '4'] })).rejects.toThrow(/Indoor and outdoor/);
    await expect(c.rideMerges.merge({ ids: ['3', '5'] })).rejects.toThrow(/12 hours/);
    expect(await createSettingsStore(dir).readRideMerges()).toEqual([]);
  });
});
