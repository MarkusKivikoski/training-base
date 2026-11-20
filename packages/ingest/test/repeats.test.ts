import {
  ACTIVITY_SCHEMA_VERSION,
  STREAM_SCHEMA_VERSION,
  repeatsFileSchema,
  type ActivityStream,
  type ActivitySummary,
} from '@app/shared';
import { describe, expect, it } from 'vitest';
import { buildRepeats } from '../src/rebuild/repeats.js';

const FTP = 200;
const GENERATED_AT = '2026-11-16T00:00:00.000Z';

const steady = (count: number, watts: number): number[] => Array<number>(count).fill(watts);

/** 5 min at 120 W, 3 × (4 min at 200 W + 2 min at 100 W), 5 min at 100 W. */
const INTERVAL_WATTS = [
  ...steady(300, 120),
  ...[0, 1, 2].flatMap(() => [...steady(240, 200), ...steady(120, 100)]),
  ...steady(300, 100),
];
/** The same length without intervals. */
const STEADY_WATTS = [...steady(300, 120), ...steady(1080, 150), ...steady(300, 100)];

function stream(watts: readonly number[] | null, heartRate: number, seconds = watts?.length ?? 1680): ActivityStream {
  const time = Array.from({ length: seconds }, (_, index) => index);
  return {
    schemaVersion: STREAM_SCHEMA_VERSION,
    time,
    power: watts ? [...watts] : null,
    hr: time.map(() => heartRate),
    cadence: null,
    speed: null,
    altitude: null,
    distance: null,
    lat: null,
    lng: null,
    laps: null,
  };
}

function summary(id: string, date: string, overrides: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id,
    name: 'Sisäpyöräily',
    sport: 'indoor_cycling',
    isCycling: true,
    isRunning: false,
    isIndoor: true,
    startTimeLocal: `${date}T18:00:00`,
    startTimeUtc: `${date}T16:00:00.000Z`,
    date,
    durationS: 1680,
    movingDurationS: 1680,
    distanceM: null,
    elevationGainM: null,
    avgSpeedMps: null,
    maxSpeedMps: null,
    avgHr: 150,
    maxHr: 160,
    avgCadence: null,
    maxCadence: null,
    avgPower: 146,
    maxPower: 200,
    activeCalories: null,
    hasPower: true,
    metrics: { np: 160, ridingTimeS: 1680, ftpUsed: FTP, intensityFactor: 0.8, tss: 30 },
    meanMaxPower: null,
    hrLoad: null,
    load: null,
    zones: {
      power: { threshold: FTP, thresholdFrom: '2026-01-01', backApplied: false, seconds: [0, 0, 0, 0, 0, 0, 0] },
      hr: null,
    },
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

/** Intervals on 1 Oct, a steady ride on 5 Oct, and the intervals again on 10 Oct: 60 s late, 5 % harder, 5 bpm lower. */
const STREAMS: Record<string, ActivityStream> = {
  '1': stream(INTERVAL_WATTS, 150),
  '2': stream(STEADY_WATTS, 140),
  '3': stream([...steady(60, 120), ...INTERVAL_WATTS.map((watts) => watts * 1.05)], 145),
  '4': stream(null, 130),
  '5': stream(INTERVAL_WATTS, 150),
};
const SUMMARIES = [
  summary('3', '2026-10-10', {
    avgHr: 145,
    metrics: { np: 168, ridingTimeS: 1740, ftpUsed: FTP, intensityFactor: 0.84, tss: 34 },
  }),
  summary('1', '2026-10-01'),
  summary('2', '2026-10-05', {
    avgHr: 140,
    metrics: { np: 140, ridingTimeS: 1680, ftpUsed: FTP, intensityFactor: 0.7, tss: 23 },
  }),
  // Not workout rides: indoor without power, and an outdoor ride with the same power trace.
  summary('4', '2026-10-06', { hasPower: false, metrics: null, avgPower: null }),
  summary('5', '2026-10-07', { isIndoor: false, sport: 'cycling' }),
];
const readStream = async (id: string) => STREAMS[id] ?? null;
const NO_ROUTES = new Map<string, Array<[number, number]>>();

describe('buildRepeats', () => {
  it('groups powered indoor rides by workout and compares each effort with the earlier ones', async () => {
    const file = await buildRepeats(SUMMARIES, readStream, {}, NO_ROUTES, { generatedAt: GENERATED_AT });
    expect(() => repeatsFileSchema.parse(file)).not.toThrow();
    expect(file.workouts.map((workout) => [workout.id, workout.efforts.map((effort) => effort.activityId)])).toEqual([
      ['workout-1', ['1', '3']],
      ['workout-2', ['2']],
    ]);

    const intervals = file.workouts[0]!;
    expect(intervals.referenceId).toBe('1');
    // The three 4-minute blocks, found from the reference ride's power to within 10 seconds.
    expect(intervals.blocks).toHaveLength(3);
    intervals.blocks.forEach((block, index) => {
      const realStartS = 300 + index * 360;
      expect(Math.abs(block.startS - realStartS)).toBeLessThanOrEqual(10);
      expect(Math.abs(block.endS - (realStartS + 240))).toBeLessThanOrEqual(10);
    });

    const [first, repeat] = intervals.efforts;
    expect(first).toMatchObject({ offsetS: 0, difference: 0, isManual: false, change: null });
    expect(first!.work).toEqual({ avgPower: 200, avgHr: 150 });
    expect(repeat).toMatchObject({ offsetS: 60, isManual: false, np: 168, avgHr: 145 });
    expect(repeat!.blocks).toEqual([
      { avgPower: 210, avgHr: 145, endHr: 145 },
      { avgPower: 210, avgHr: 145, endHr: 145 },
      { avgPower: 210, avgHr: 145, endHr: 145 },
    ]);
    // Over the work blocks: 210 W at 145 bpm against 200 W at 150 bpm.
    expect(repeat!.change).toEqual({ againstCount: 1, powerPct: 5, hrBpm: -5, efficiencyPct: 8.6 });
  });

  it('compares a workout without work blocks on NP and average heart rate', async () => {
    const steadyRepeat = summary('6', '2026-10-12', {
      avgHr: 133,
      metrics: { np: 140, ridingTimeS: 1680, ftpUsed: FTP, intensityFactor: 0.7, tss: 23 },
    });
    const streams: Record<string, ActivityStream> = { ...STREAMS, '6': stream(STEADY_WATTS, 133) };
    const file = await buildRepeats([...SUMMARIES, steadyRepeat], async (id) => streams[id] ?? null, {}, NO_ROUTES, {
      generatedAt: GENERATED_AT,
    });
    const steadyWorkout = file.workouts.find((workout) => workout.id === 'workout-2')!;
    expect(steadyWorkout.blocks).toEqual([]);
    expect(steadyWorkout.efforts.map((effort) => effort.work)).toEqual([null, null]);
    // 140 W at 133 bpm against 140 W at 140 bpm.
    expect(steadyWorkout.efforts[1]!.change).toEqual({ againstCount: 1, powerPct: 0, hrBpm: -7, efficiencyPct: 5.3 });
  });

  it('keeps a ride set to "own" apart, and adds a ride placed in a workout by hand', async () => {
    const apart = await buildRepeats(SUMMARIES, readStream, { '3': 'own' }, NO_ROUTES, { generatedAt: GENERATED_AT });
    expect(apart.workouts.map((workout) => workout.efforts.map((effort) => effort.activityId))).toEqual([
      ['1'],
      ['2'],
      ['3'],
    ]);

    const placed = await buildRepeats(SUMMARIES, readStream, { '2': 'workout-1' }, NO_ROUTES, {
      generatedAt: GENERATED_AT,
    });
    expect(placed.workouts).toHaveLength(1);
    const efforts = placed.workouts[0]!.efforts;
    expect(efforts.map((effort) => [effort.activityId, effort.isManual])).toEqual([
      ['1', false],
      ['2', true],
      ['3', false],
    ]);
    expect(efforts[1]!.difference).toBeGreaterThan(0.08);
  });

  it('matches a ride automatically when the workout it was placed in no longer exists', async () => {
    const file = await buildRepeats(SUMMARIES, readStream, { '3': 'workout-999' }, NO_ROUTES, {
      generatedAt: GENERATED_AT,
    });
    expect(file.workouts[0]!.efforts.map((effort) => [effort.activityId, effort.isManual])).toEqual([
      ['1', false],
      ['3', false],
    ]);
  });

  it('does not compare a ride that was cut short before the last work block', async () => {
    const cutShort = summary('7', '2026-10-14', { durationS: 1000 });
    const streams: Record<string, ActivityStream> = { ...STREAMS, '7': stream(INTERVAL_WATTS.slice(0, 1000), 150) };
    const file = await buildRepeats(
      [...SUMMARIES, cutShort],
      async (id) => streams[id] ?? null,
      { '7': 'workout-1' },
      NO_ROUTES,
      {
        generatedAt: GENERATED_AT,
      },
    );
    const effort = file.workouts[0]!.efforts.find((candidate) => candidate.activityId === '7')!;
    expect(effort.blocks.map((block) => block !== null)).toEqual([true, true, false]);
    expect(effort.change).toBeNull();
  });
});
