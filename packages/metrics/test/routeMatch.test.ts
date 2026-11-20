import { describe, expect, it } from 'vitest';
import { groupRoutes, isSameRoute, routeCoverage, routeSignature, sameOrderShare, type LngLat } from '../src/index.js';

const METRES_PER_DEG_LAT = 111_320;
const METRES_PER_DEG_LNG = METRES_PER_DEG_LAT * Math.cos((60 * Math.PI) / 180);

/** A point `eastM` and `northM` metres from 25°E 60°N. */
const at = (eastM: number, northM: number): LngLat => [
  25 + eastM / METRES_PER_DEG_LNG,
  60 + northM / METRES_PER_DEG_LAT,
];

/** A 2 km × 1 km rectangle ridden anticlockwise from its south-west corner, shifted by `driftM` metres. */
const loop = (driftM = 0): LngLat[] => [
  at(driftM, driftM),
  at(2000 + driftM, driftM),
  at(2000 + driftM, 1000 + driftM),
  at(driftM, 1000 + driftM),
  at(driftM, driftM),
];
const LOOP_M = 6000;

const ride = (points: LngLat[], distanceM = LOOP_M) => ({ signature: routeSignature(points), distanceM });

describe('routeSignature', () => {
  it('lists every cell along a simplified line once, in the order entered', () => {
    const signature = routeSignature([at(0, 10), at(1000, 10)]);
    // 1 km of 75 m cells: 13 or 14 cells, all in one row.
    expect(signature.cells.length).toBeGreaterThanOrEqual(13);
    expect(signature.cells.length).toBeLessThanOrEqual(15);
    expect(new Set(signature.cells.map(([, y]) => y)).size).toBe(1);
    const columns = signature.cells.map(([x]) => x);
    expect(columns).toEqual([...columns].sort((a, b) => a - b));
    expect(signature.keys.size).toBe(signature.cells.length);
  });

  it('counts a road ridden out and back once', () => {
    const out = routeSignature([at(0, 10), at(1000, 10)]);
    const outAndBack = routeSignature([at(0, 10), at(1000, 10), at(0, 10)]);
    expect(outAndBack.cells.length).toBe(out.cells.length);
  });
});

describe('route matching', () => {
  const reference = ride(loop());

  it('matches the same loop with GPS drift', () => {
    const drifted = ride(loop(30));
    expect(routeCoverage(reference.signature, drifted.signature)).toBeGreaterThan(0.95);
    expect(sameOrderShare(reference.signature, reference.signature)).toBe(1);
    expect(isSameRoute(reference, drifted)).toBe(true);
  });

  it('does not match the same loop ridden the other way round', () => {
    const reversed = ride([...loop()].reverse());
    expect(routeCoverage(reference.signature, reversed.signature)).toBe(1);
    expect(sameOrderShare(reference.signature, reversed.signature)).toBeLessThan(0.3);
    expect(isSameRoute(reference, reversed)).toBe(false);
  });

  it('does not match a loop on other roads, or one of another length', () => {
    const elsewhere = ride(loop(600));
    expect(routeCoverage(reference.signature, elsewhere.signature)).toBeLessThan(0.5);
    expect(isSameRoute(reference, elsewhere)).toBe(false);
    expect(isSameRoute(reference, ride(loop(), LOOP_M * 1.08))).toBe(false);
  });

  it('does not match a ride that covers the loop and then goes further', () => {
    const extended = ride([...loop(), at(0, -3000)], LOOP_M + 300);
    expect(isSameRoute(reference, extended)).toBe(false);
  });
});

describe('groupRoutes', () => {
  it('keeps a route together when its first ride took a detour the later rides did not', () => {
    // The loop with an out-and-back spur at one corner, each ride with less of the spur.
    const withSpur = (spurM: number): LngLat[] => [
      at(0, 0),
      at(2000, 0),
      at(2000 + spurM, 0),
      at(2000, 0),
      at(2000, 1000),
      at(0, 1000),
      at(0, 0),
    ];
    const first = { id: 'first', ...ride(withSpur(900), LOOP_M + 150) };
    const second = { id: 'second', ...ride(withSpur(450), LOOP_M + 100) };
    const third = { id: 'third', ...ride(loop(), LOOP_M) };

    // The third ride is too far from the first on its own, but is the same route as the second.
    expect(isSameRoute(first, third)).toBe(false);
    expect(isSameRoute(first, second)).toBe(true);
    expect(isSameRoute(second, third)).toBe(true);
    const groups = groupRoutes([first, second, third]);
    expect(groups.map((group) => group.members.map((member) => member.id))).toEqual([['first', 'second', 'third']]);
    expect(groups[0]!.reference.id).toBe('first');
  });

  it('groups repeats under the first ride of the route', () => {
    const rides = [
      { id: 'loop-1', ...ride(loop()) },
      { id: 'reverse-1', ...ride([...loop()].reverse()) },
      { id: 'loop-2', ...ride(loop(20)) },
      { id: 'reverse-2', ...ride([...loop(20)].reverse()) },
      { id: 'other', ...ride(loop(600)) },
    ];
    const groups = groupRoutes(rides);
    expect(groups.map((group) => group.members.map((member) => member.id))).toEqual([
      ['loop-1', 'loop-2'],
      ['reverse-1', 'reverse-2'],
      ['other'],
    ]);
    expect(groups[0]!.reference.id).toBe('loop-1');
  });
});
