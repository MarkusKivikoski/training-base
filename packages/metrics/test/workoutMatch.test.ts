import { describe, expect, it } from 'vitest';
import {
  alignWorkouts,
  comparableWorkBlocks,
  groupWorkouts,
  isSameWorkout,
  workBlockStats,
  workoutProfile,
  workSummary,
} from '../src/index.js';

const seconds = (count: number) => Array.from({ length: count }, (_, index) => index);
const steady = (count: number, watts: number): number[] => Array<number>(count).fill(watts);

/** 5 min at 120 W, 3 × (4 min at 200 W + 2 min at 100 W), 5 min at 100 W: 28 minutes. */
const INTERVAL_WATTS = [
  ...steady(300, 120),
  ...[0, 1, 2].flatMap(() => [...steady(240, 200), ...steady(120, 100)]),
  ...steady(300, 100),
];
/** The same length without intervals: 18 minutes steady at 150 W in the middle. */
const STEADY_WATTS = [...steady(300, 120), ...steady(1080, 150), ...steady(300, 100)];

const profileOf = (watts: readonly number[]) => workoutProfile(seconds(watts.length), watts);

describe('workoutProfile', () => {
  it('averages power per 10 seconds and smooths over three bins', () => {
    const profile = workoutProfile(seconds(60), [...steady(30, 100), ...steady(30, 400)]);
    expect(profile).toEqual([100, 100, 200, 300, 400, 400]);
  });

  it('counts seconds without a reading as 0 W', () => {
    // A 50-second pause after the first 10 seconds.
    const time = [...seconds(10), ...seconds(10).map((second) => second + 60)];
    const profile = workoutProfile(time, steady(20, 300), { smoothBins: 1 });
    expect(profile).toEqual([300, 0, 0, 0, 0, 0, 300]);
  });

  it('is empty for a ride without power', () => {
    expect(workoutProfile(seconds(600), null)).toEqual([]);
    expect(workoutProfile(seconds(600), steady(600, 0))).toEqual([]);
  });
});

describe('alignWorkouts and isSameWorkout', () => {
  const reference = profileOf(INTERVAL_WATTS);

  it('matches the same workout recorded from 90 seconds earlier', () => {
    const late = profileOf([...steady(90, 120), ...INTERVAL_WATTS]);
    const alignment = alignWorkouts(reference, late);
    expect(alignment?.offsetS).toBe(90);
    expect(alignment?.difference).toBeCloseTo(0, 6);
    expect(isSameWorkout(reference, late, alignment)).toBe(true);
  });

  it('matches the same workout ridden at 5 % more power', () => {
    const harder = profileOf(INTERVAL_WATTS.map((watts) => watts * 1.05));
    const alignment = alignWorkouts(reference, harder);
    expect(alignment?.offsetS).toBe(0);
    expect(alignment?.scale).toBeCloseTo(1 / 1.05, 6);
    expect(alignment?.difference).toBeCloseTo(0, 6);
    expect(isSameWorkout(reference, harder, alignment)).toBe(true);
  });

  it('does not match a different workout of the same length', () => {
    const other = profileOf(STEADY_WATTS);
    const alignment = alignWorkouts(reference, other);
    expect(alignment?.difference).toBeGreaterThan(0.15);
    expect(isSameWorkout(reference, other, alignment)).toBe(false);
  });

  it('does not match the same workout at a power outside the allowed scale', () => {
    const muchHarder = profileOf(INTERVAL_WATTS.map((watts) => watts * 1.3));
    expect(isSameWorkout(reference, muchHarder, alignWorkouts(reference, muchHarder))).toBe(false);
  });

  it('does not match a ride that is much longer, even when the start is identical', () => {
    const longer = profileOf([...INTERVAL_WATTS, ...steady(600, 100)]);
    const alignment = alignWorkouts(reference, longer);
    expect(alignment?.difference).toBeCloseTo(0, 6);
    expect(isSameWorkout(reference, longer, alignment)).toBe(false);
  });

  it('has no alignment for rides that overlap less than ten minutes', () => {
    const short = profileOf(steady(300, 150));
    expect(alignWorkouts(reference, short)).toBeNull();
    expect(isSameWorkout(reference, short, null)).toBe(false);
  });
});

describe('groupWorkouts', () => {
  it('groups repeats under the first ride of the workout and leaves out rides without power', () => {
    const rides = [
      { id: 'intervals-1', profile: profileOf(INTERVAL_WATTS) },
      { id: 'steady-1', profile: profileOf(STEADY_WATTS) },
      { id: 'no-power', profile: [] },
      { id: 'intervals-2', profile: profileOf([...steady(60, 120), ...INTERVAL_WATTS.map((watts) => watts * 1.03)]) },
    ];
    const groups = groupWorkouts(rides);
    expect(groups.map((group) => group.members.map((member) => member.ride.id))).toEqual([
      ['intervals-1', 'intervals-2'],
      ['steady-1'],
    ]);
    expect(groups[0]!.reference.id).toBe('intervals-1');
    expect(groups[0]!.members[0]!.alignment).toEqual({ offsetS: 0, scale: 1, difference: 0 });
    expect(groups[0]!.members[1]!.alignment.offsetS).toBe(60);
  });

  it('starts a new group for a ride that is kept apart, which later rides can still join', () => {
    const rides = [
      { id: 'first', profile: profileOf(INTERVAL_WATTS) },
      { id: 'apart', profile: profileOf(INTERVAL_WATTS) },
      { id: 'third', profile: profileOf(INTERVAL_WATTS) },
    ];
    const groups = groupWorkouts(rides, { isKeptApart: (ride) => ride.id === 'apart' });
    expect(groups.map((group) => group.members.map((member) => member.ride.id))).toEqual([
      ['first', 'third'],
      ['apart'],
    ]);
  });
});

describe('workBlockStats and workSummary', () => {
  // The interval workout, started 90 seconds late, with heart rate climbing one beat every 10 seconds.
  const watts = [...steady(90, 120), ...INTERVAL_WATTS];
  const stream = {
    time: seconds(watts.length),
    power: watts,
    hr: seconds(watts.length).map((second) => 100 + Math.floor(second / 10)),
    cadence: null,
    distance: null,
  };
  const firstBlock = { startS: 300, endS: 540 };

  it('reads a block given on the reference clock from the shifted ride', () => {
    const stats = workBlockStats(stream, firstBlock, 90);
    expect(stats?.avgPower).toBeCloseTo(200, 6);
    // Seconds 390–629: heart rate 139 … 162.
    expect(stats?.avgHr).toBeCloseTo(150.5, 6);
    // The last 30 seconds: 160, 161, 162.
    expect(stats?.endHr).toBeCloseTo(161, 6);
  });

  it('is null for a block the ride does not cover', () => {
    expect(workBlockStats(stream, { startS: 1700, endS: 1900 }, 90)).toBeNull();
    expect(workBlockStats(stream, firstBlock, -400)).toBeNull();
  });

  it('compares over work blocks only when they add up to five minutes', () => {
    const sprints = [
      { startS: 600, endS: 640 },
      { startS: 900, endS: 940 },
    ];
    const intervals = [firstBlock, { startS: 660, endS: 900 }];
    expect(comparableWorkBlocks(sprints)).toEqual([]);
    expect(comparableWorkBlocks(intervals)).toEqual(intervals);
    expect(comparableWorkBlocks([])).toEqual([]);
  });

  it('weights the work summary by block length and skips blocks that were not ridden', () => {
    const blocks = [
      { startS: 0, endS: 300 },
      { startS: 400, endS: 500 },
      { startS: 600, endS: 700 },
    ];
    const stats = [{ avgPower: 200, avgHr: 150, endHr: 155 }, { avgPower: 240, avgHr: 170, endHr: 175 }, null];
    expect(workSummary(blocks, stats)).toEqual({ avgPower: 210, avgHr: 155 });
    expect(workSummary(blocks, [null, null, null])).toBeNull();
    expect(workSummary([], [])).toBeNull();
  });
});
