import { describe, expect, it } from 'vitest';
import type { LngLat } from '../src/fit/simplifyRoute.js';
import { haversineM, trimRoute } from '../src/fit/trimRoute.js';

// Along a meridian 1 degree of latitude is 111 194.9 m with R = 6 371 km.
const M_PER_DEG = (6_371_000 * Math.PI) / 180;
const north = (m: number): LngLat => [25, 60 + m / M_PER_DEG];
const line = (...metres: number[]) => metres.map(north);
const metresOf = (p: LngLat) => Math.round(haversineM(north(0), p));

describe('trimRoute', () => {
  it('returns an identical copy when the trim is 0', () => {
    const route = line(0, 100, 250);
    const out = trimRoute(route, 0);
    expect(out).toEqual(route);
    expect(out).not.toBe(route);
  });

  it('cuts a straight 1 km line down to 100–900 m', () => {
    const out = trimRoute(line(0, 500, 1000), 100);
    expect(out.map(metresOf)).toEqual([100, 500, 900]);
  });

  it('interpolates the cut points inside a segment and drops points in the trimmed part', () => {
    const out = trimRoute(line(0, 50, 120, 400, 700, 950, 1000), 200);
    expect(out.map(metresOf)).toEqual([200, 400, 700, 800]);
  });

  it('does not repeat a point that sits exactly on the cut', () => {
    const out = trimRoute(line(0, 200, 500, 800, 1000), 200);
    expect(out.map(metresOf)).toEqual([200, 500, 800]);
  });

  it('returns an empty route when the route is not longer than twice the trim', () => {
    expect(trimRoute(line(0, 150, 300), 150)).toEqual([]);
    expect(trimRoute(line(0, 100), 200)).toEqual([]);
    expect(trimRoute([north(0)], 50)).toEqual([]);
  });
});
