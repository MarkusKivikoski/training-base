import { MEAN_MAX_DURATIONS_S, RECORD_DISTANCES_M, RUN_RECORD_DISTANCES_M } from '@app/metrics';
import { ACTIVITY_SCHEMA_VERSION, recordsFileSchema, type ActivitySummary, type Climb } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildRecords } from '../src/rebuild/records.js';

function ride(id: string, date: string, o: Partial<ActivitySummary> = {}): ActivitySummary {
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
    durationS: 4000,
    movingDurationS: 3600,
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
    ...o,
  };
}

/** Per-ride record inputs: seconds for 1 km and 5 km, longer distances null. */
const recs = (km1: number, km5: number | null, maxSpeedMps: number, distanceM = 30000, movingS = 3600) => ({
  distanceBestsS: RECORD_DISTANCES_M.map((_, i) => (i === 0 ? km1 : i === 1 ? km5 : null)),
  maxSpeedMps,
  distanceM,
  movingS,
});

describe('buildRecords', () => {
  const rides = [
    ride('1', '2025-06-01', { records: recs(100, 600, 15), distanceM: 50000, movingDurationS: 6000 }),
    ride('2', '2026-05-10', { records: recs(90, 650, 16.5), elevationGainM: 900, maxHr: 185 }),
    ride('3', '2026-05-11', { records: recs(95, null, 14, 15000), distanceM: 15000 }),
    // Indoor: never in speed or distance records, but counts for time and power.
    ride('4', '2026-11-01', {
      isIndoor: true,
      records: recs(60, 300, 20),
      distanceM: 90000,
      movingDurationS: 9000,
      hasPower: true,
      meanMaxPower: MEAN_MAX_DURATIONS_S.map((d) => (d <= 1200 ? 250 : null)),
    }),
    ride('5', '2026-05-12', { isCycling: false, sport: 'strength_training', maxHr: 199 }),
  ];
  const file = buildRecords(rides, { today: '2026-11-06', generatedAt: '2026-11-06T00:00:00.000Z' });
  const cycling = file.disciplines.cycling;
  const all = cycling.scopes['all']!;

  it('validates, lists years newest first and has a scope per year', () => {
    expect(recordsFileSchema.parse(file)).toEqual(file);
    expect(cycling.years).toEqual([2026, 2025]);
    expect(Object.keys(cycling.scopes).sort()).toEqual(['2025', '2026', 'all']);
  });

  it('ranks fastest efforts outdoor only, lowest time first, with average speed', () => {
    const km1 = all.efforts[0]!;
    expect(km1.distanceM).toBe(1000);
    expect(km1.top.map((e) => [e.id, e.value])).toEqual([
      ['2', 90],
      ['3', 95],
      ['1', 100],
    ]);
    expect(km1.top[0]!.extra).toBeCloseTo(1000 / 90, 3);
    expect(all.efforts[1]!.top.map((e) => e.id)).toEqual(['1', '2']); // 5 km: ride 3 is too short
    expect(all.efforts[2]!.top).toEqual([]); // 10 km: nobody
  });

  it('keeps indoor rides out of speed and distance, but in moving time and power', () => {
    expect(all.maxSpeed[0]).toMatchObject({ id: '2', value: 16.5 });
    expect(all.longestDistance.map((e) => e.id)).toEqual(['1', '2', '3']);
    expect(all.longestTime[0]).toMatchObject({ id: '4', value: 9000 });
    expect(all.power.find((p) => p.durationS === 1200)!.top[0]).toMatchObject({ id: '4', value: 250 });
    expect(all.power.find((p) => p.durationS === 3600)!.top).toEqual([]);
  });

  it('builds ride highs from cycling only, and the 20 km rule for average speed', () => {
    expect(all.highs.elevation[0]).toMatchObject({ id: '2', value: 900 });
    expect(all.highs.maxHr[0]).toMatchObject({ id: '2', value: 185 }); // the strength session's 199 doesn't count
    expect(all.highs.avgSpeed.map((e) => e.id)).not.toContain('3'); // 15 km ride
  });

  it('builds rides per period, hilliest ride, earliest start, breaks and first rides', () => {
    expect(all.periods.week.rides[0]).toMatchObject({ date: '2025-05-26', value: 1 }); // every week has one ride; ties go to the oldest
    expect(all.periods.year?.rides[0]).toMatchObject({ date: '2026', value: 3 });
    // Ride 2: 900 m over 30 km = 30 m/km; ride 4 is indoor.
    expect(all.highs.hilliest[0]).toMatchObject({ id: '2', value: 30, extra: 900 });
    expect(all.highs.hilliest.map((e) => e.id)).not.toContain('4');
    expect(all.highs.earliestStart[0]).toMatchObject({ id: '1', value: 8 * 3600 }); // all 08:00, oldest first
    // 1 Jun 2025 -> 10 May 2026 is the longest gap; ride 2 ended it.
    expect(all.breaks[0]).toMatchObject({ id: '2', date: '2026-05-10', value: 342 });
    expect(cycling.scopes['2025']!.breaks).toEqual([]);
    expect(all.firstRides.map((e) => [e.date, e.id])).toEqual([
      ['2026-05-10', '2'],
      ['2025-06-01', '1'],
    ]);
    expect(cycling.scopes['2026']!.firstRides.map((e) => e.id)).toEqual(['2']);
  });

  it('builds periods and streaks, with biggest year and current streaks in all-time only', () => {
    expect(all.periods.year?.hours[0]?.date).toBe('2026');
    expect(cycling.scopes['2026']!.periods.year).toBeNull();
    expect(all.streaks.days).toEqual({ length: 2, from: '2026-05-10', to: '2026-05-11' });
    // Last ride Sun 1 Nov is in last ISO week (from 26 Oct), so the week streak still runs on Fri 6 Nov.
    expect(all.streaks.currentWeeks).toEqual({ length: 1, from: '2026-10-26', to: '2026-10-26' });
    expect(all.streaks.currentDays).toBeNull();
    expect(cycling.scopes['2026']!.streaks).not.toHaveProperty('currentDays');
  });
});

describe('climb records', () => {
  const effort = (date: string) => ({
    activityId: '1',
    date,
    name: 'Ride',
    startS: 0,
    timeS: 100,
    avgPower: null,
    avgHr: null,
    rank: 1,
  });
  const climb = (id: string, lengthM: number, gainM: number, dates: string[]): Climb => ({
    id,
    lengthM,
    gainM,
    avgGrade: gainM / lengthM,
    maxGrade: gainM / lengthM,
    score: lengthM * (gainM / lengthM) * 100,
    start: [25, 60],
    end: [25, 60.01],
    path: [],
    profile: [],
    efforts: dates.map(effort),
  });
  const climbs = [
    climb('1-0', 1200, 40, ['2025-06-01', '2025-07-01', '2026-05-01']),
    climb('2-0', 500, 45, ['2026-06-01']),
    climb('3-0', 800, 20, ['2025-05-01']),
    climb('4-0', 300, 15, ['2024-05-01']),
  ];
  const file = buildRecords([], { today: '2026-11-06', generatedAt: '2026-11-06T00:00:00.000Z', climbs });

  it('ranks distinct climbs by length and by gain, dated by the last effort', () => {
    const { longest, biggestGain } = file.disciplines.cycling.scopes['all']!.climbs;
    expect(file.disciplines.running.scopes['all']!.climbs).toEqual({ longest: [], biggestGain: [] });
    expect(longest).toEqual([
      { id: '1-0', date: '2026-05-01', value: 1200, extra: 40 },
      { id: '3-0', date: '2025-05-01', value: 800, extra: 20 },
      { id: '2-0', date: '2026-06-01', value: 500, extra: 45 },
    ]);
    expect(biggestGain.map((e) => [e.id, e.value, e.extra])).toEqual([
      ['2-0', 45, 500],
      ['1-0', 40, 1200],
      ['3-0', 20, 800],
    ]);
  });

  it('counts only climbs ridden in a year for that year', () => {
    const years = buildRecords([ride('9', '2025-06-01'), ride('8', '2026-06-01')], {
      today: '2026-11-06',
      generatedAt: '2026-11-06T00:00:00.000Z',
      climbs,
    }).disciplines.cycling.scopes;
    expect(years['2025']!.climbs.longest.map((e) => [e.id, e.date])).toEqual([
      ['1-0', '2025-07-01'],
      ['3-0', '2025-05-01'],
    ]);
  });
});

describe('run records', () => {
  /** Per-run record inputs: seconds for 1 km and 5 km, the other run distances null. */
  const runRecs = (km1: number, km5: number | null, distanceM: number, movingS: number) => ({
    distanceBestsS: RUN_RECORD_DISTANCES_M.map((distance) => {
      if (distance === 1_000) return km1;
      return distance === 5_000 ? km5 : null;
    }),
    maxSpeedMps: 6,
    distanceM,
    movingS,
  });
  const run = (id: string, date: string, o: Partial<ActivitySummary> = {}) =>
    ride(id, date, { name: `Run ${id}`, sport: 'running', isCycling: false, isRunning: true, ...o });

  const activities = [
    ride('1', '2026-05-01', {
      records: recs(90, 600, 16),
      hasPower: true,
      meanMaxPower: MEAN_MAX_DURATIONS_S.map(() => 200),
    }),
    run('2', '2026-05-02', { records: runRecs(300, 1600, 8000, 2700), distanceM: 8000, movingDurationS: 2700 }),
    run('3', '2026-05-04', { records: runRecs(280, null, 3000, 900), distanceM: 3000, movingDurationS: 900 }),
    run('4', '2025-09-01', { records: runRecs(310, 1500, 6000, 1900), distanceM: 6000, isIndoor: true }),
  ];
  const file = buildRecords(activities, { today: '2026-11-06', generatedAt: '2026-11-06T00:00:00.000Z' });
  const running = file.disciplines.running;
  const all = running.scopes['all']!;

  it('keeps runs and rides apart, each with its own years', () => {
    expect(recordsFileSchema.parse(file)).toEqual(file);
    expect(running.years).toEqual([2026, 2025]);
    expect(file.disciplines.cycling.years).toEqual([2026]);
    expect(file.disciplines.cycling.scopes['all']!.longestTime.map((e) => e.id)).toEqual(['1']);
    expect(all.longestTime.map((e) => e.id)).toEqual(['4', '2', '3']); // run 4 keeps the fixture's 3600 s
  });

  it('ranks fastest efforts over the run distances, outdoor runs only', () => {
    expect(all.efforts.map((e) => e.distanceM)).toEqual([...RUN_RECORD_DISTANCES_M]);
    expect(all.efforts[0]!.top.map((e) => [e.id, e.value])).toEqual([
      ['3', 280],
      ['2', 300],
    ]);
    const km5 = all.efforts.find((e) => e.distanceM === 5_000)!;
    expect(km5.top.map((e) => e.id)).toEqual(['2']); // run 4 is on a treadmill
  });

  it('uses the 5 km rule for average pace, and has no top speed, power or climb records', () => {
    expect(all.highs.avgSpeed.map((e) => e.id)).toEqual(['2']); // run 3 is only 3 km
    expect(all.highs.avgSpeed[0]!.value).toBeCloseTo(8000 / 2700, 3);
    expect(all.maxSpeed).toEqual([]);
    expect(all.power).toEqual([]);
    expect(all.climbs).toEqual({ longest: [], biggestGain: [] });
  });

  it('builds streaks, breaks and first runs from runs only', () => {
    expect(all.streaks.days).toMatchObject({ length: 1 }); // the ride on 1 May doesn't join 2 May
    expect(all.firstRides.map((e) => e.id)).toEqual(['2', '4']);
    expect(all.breaks[0]).toMatchObject({ id: '2', value: 242 }); // 1 Sep 2025 -> 2 May 2026
  });
});
