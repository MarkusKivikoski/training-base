import { describe, expect, it } from 'vitest';
import {
  climbCandidates,
  detectClimbs,
  duplicateClimbs,
  findClimbPasses,
  groupClimbs,
  metresBetween,
  type ClimbStreamInput,
  type LngLat,
} from '../src/index.js';

const M_PER_DEG = 111_195;
const ORIGIN: LngLat = [25, 60];

/**
 * A ride along a north-south road at 5 m/s, one sample per second. `path` gives the position along
 * the road (metres north of the origin) at each second; `alt` the altitude at a road position.
 */
function ride(path: number[], alt: (y: number) => number, eastM = 0): ClimbStreamInput {
  let d = 0;
  const distance = path.map((y, i) => (i === 0 ? 0 : (d += Math.abs(y - path[i - 1]!))));
  return {
    time: path.map((_, i) => i),
    distance,
    altitude: path.map(alt),
    lat: path.map((y) => ORIGIN[1] + y / M_PER_DEG),
    lng: path.map(() => ORIGIN[0] + eastM / (M_PER_DEG * Math.cos(ORIGIN[1] * (Math.PI / 180)))),
  };
}

/** Road positions from `from` to `to` at 5 m/s. */
const leg = (from: number, to: number) => {
  const n = Math.round(Math.abs(to - from) / 5);
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / n);
};

// Flat 1 km, then 500 m at 6 % (30 m up), then 500 m down, then flat.
const hill = (y: number) =>
  y < 1000 ? 20 : y < 1500 ? 20 + (y - 1000) * 0.06 : y < 2000 ? 50 - (y - 1500) * 0.06 : 20;

describe('detectClimbs', () => {
  it('finds a 500 m climb at 6 % with its start, length and gain', () => {
    const climbs = detectClimbs(ride(leg(0, 3000), hill));
    expect(climbs).toHaveLength(1);
    const c = climbs[0]!;
    expect(Math.abs(c.startDistM - 1000)).toBeLessThanOrEqual(60);
    expect(Math.abs(c.lengthM - 500)).toBeLessThanOrEqual(80);
    expect(Math.abs(c.gainM - 30)).toBeLessThanOrEqual(4);
    expect(c.avgGrade).toBeGreaterThan(0.05);
    expect(c.maxGrade).toBeGreaterThanOrEqual(c.avgGrade);
    expect(metresBetween(c.start, [ORIGIN[0], ORIGIN[1] + 1000 / M_PER_DEG])).toBeLessThan(60);
    expect(c.endS - c.startS).toBeGreaterThan(80); // ~500 m at 5 m/s
  });

  it('ignores flat rides, gentle drags and bumps too small to count', () => {
    expect(detectClimbs(ride(leg(0, 3000), () => 20))).toEqual([]);
    expect(detectClimbs(ride(leg(0, 3000), (y) => 20 + y * 0.015))).toEqual([]); // 45 m, but at 1.5 %
    expect(detectClimbs(ride(leg(0, 3000), (y) => (y > 1000 && y < 1150 ? 20 + (y - 1000) * 0.06 : 20)))).toEqual([]); // 9 m
  });

  it('splits two hills separated by a descent', () => {
    const twoHills = (y: number) => (y < 3000 ? hill(y) : hill(y - 3000));
    expect(detectClimbs(ride(leg(0, 6000), twoHills))).toHaveLength(2);
  });

  it('returns nothing without altitude or GPS', () => {
    expect(detectClimbs({ ...ride(leg(0, 3000), hill), altitude: null })).toEqual([]);
    expect(detectClimbs({ ...ride(leg(0, 3000), hill), lat: null })).toEqual([]);
  });
});

describe('findClimbPasses', () => {
  const ref = detectClimbs(ride(leg(0, 3000), hill))[0]!;

  it('times a pass from the closest approach to the start to the closest approach to the end', () => {
    const passes = findClimbPasses(ride(leg(0, 3000), hill), ref);
    expect(passes).toHaveLength(1);
    expect(passes[0]!.endS - passes[0]!.startS).toBe(ref.endS - ref.startS);
  });

  it('counts each repeat uphill and never the way down', () => {
    // Up, back down to the bottom, up again, then home.
    const path = [...leg(500, 1600), ...leg(1600, 900), ...leg(900, 1600), ...leg(1600, 500)];
    expect(findClimbPasses(ride(path, hill), ref)).toHaveLength(2);
    // Only riding it downhill.
    expect(findClimbPasses(ride(leg(3000, 0), hill), ref)).toEqual([]);
  });

  it('ignores a parallel road 200 m away', () => {
    expect(findClimbPasses(ride(leg(0, 3000), hill, 200), ref)).toEqual([]);
  });
});

describe('groupClimbs and climbCandidates', () => {
  const a = { start: ORIGIN, end: [ORIGIN[0], ORIGIN[1] + 500 / M_PER_DEG] as LngLat, lengthM: 500 };
  const nearA = { start: [ORIGIN[0], ORIGIN[1] + 30 / M_PER_DEG] as LngLat, end: a.end, lengthM: 470 };
  const far = {
    start: [ORIGIN[0] + 0.1, ORIGIN[1]] as LngLat,
    end: [ORIGIN[0] + 0.1, ORIGIN[1] + 0.005] as LngLat,
    lengthM: 550,
  };

  it('groups detections of the same hill under the first one', () => {
    const groups = groupClimbs([a, nearA, far]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.ref).toBe(a);
    expect(groups[0]!.members).toEqual([a, nearA]);
  });

  it('keeps only climbs whose start and end the ride passes', () => {
    const s = ride(leg(-200, 800), () => 20);
    expect(climbCandidates(s, [a, far])).toEqual([0]);
    expect(
      climbCandidates(
        ride(leg(-200, 300), () => 20),
        [a],
      ),
    ).toEqual([]); // never reaches the end
  });
});

describe('duplicateClimbs', () => {
  const pass = (activityId: string, startS: number, endS: number) => ({ activityId, startS, endS });
  it('drops a climb whose passes mostly cover the same stretch as a climb with more passes', () => {
    const big = [pass('1', 100, 200), pass('2', 50, 150), pass('3', 10, 110)];
    const sameHill = [pass('1', 110, 205), pass('2', 55, 140)]; // shifted end points
    const steepTop = [pass('1', 170, 200), pass('2', 120, 150)]; // last 30 % only
    const elsewhere = [pass('1', 500, 600)];
    expect([...duplicateClimbs([sameHill, big, steepTop, elsewhere])]).toEqual([0]);
  });
});
