import { describe, expect, it } from 'vitest';
import {
  isoWeekStart,
  outdoorDistanceM,
  outdoorElevationGainM,
  wattsPerKg,
  weeklyVolume,
  type VolumeInput,
} from '../src/index.js';

describe('isoWeekStart', () => {
  it.each([
    ['2026-11-02', '2026-11-02'], // Monday
    ['2026-11-04', '2026-11-02'], // Wednesday
    ['2026-11-08', '2026-11-02'], // Sunday
    ['2026-11-09', '2026-11-09'], // next Monday
    ['2027-01-01', '2026-12-28'], // across a year boundary
  ])('%s -> %s', (date, monday) => {
    expect(isoWeekStart(date)).toBe(monday);
  });
});

const ride = (
  date: string,
  hours: number,
  km: number | null,
  isIndoor: boolean,
  elev: number | null = null,
): VolumeInput => ({
  date,
  durationS: hours * 3600,
  distanceM: km === null ? null : km * 1000,
  elevationGainM: elev,
  isIndoor,
});

describe('weeklyVolume', () => {
  it('returns the requested weeks oldest first, including empty weeks', () => {
    const weeks = weeklyVolume([], { endDate: '2026-11-04', weeks: 3 });
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(weeks.every((w) => w.count === 0 && w.indoorDurationS === 0)).toBe(true);
  });

  it('splits indoor and outdoor time and sums distance and elevation of outdoor rides only', () => {
    const [prev, cur] = weeklyVolume(
      [
        ride('2026-11-02', 1, 30, true, 150), // indoor: time counts, distance and elevation don't
        ride('2026-11-03', 2, 60, false, 500),
        ride('2026-11-08', 0.5, null, true),
        ride('2026-10-27', 1.5, 45, false, 200),
      ],
      { endDate: '2026-11-04', weeks: 2 },
    );
    expect(cur).toEqual({
      weekStart: '2026-11-02',
      indoorDurationS: 1.5 * 3600,
      outdoorDurationS: 2 * 3600,
      distanceM: 60_000,
      elevationGainM: 500,
      count: 3,
    });
    expect(prev).toMatchObject({ weekStart: '2026-10-26', outdoorDurationS: 1.5 * 3600, count: 1 });
  });

  it('ignores activities outside the window', () => {
    const weeks = weeklyVolume([ride('2026-01-01', 1, 10, false), ride('2026-12-01', 1, 10, false)], {
      endDate: '2026-11-04',
      weeks: 4,
    });
    expect(weeks.reduce((n, w) => n + w.count, 0)).toBe(0);
  });
});

describe('outdoorDistanceM and outdoorElevationGainM', () => {
  it('count outdoor rides in full and indoor rides as zero', () => {
    expect(outdoorDistanceM(ride('2026-11-02', 1, 30, false))).toBe(30_000);
    expect(outdoorDistanceM(ride('2026-11-02', 1, 30, true))).toBe(0);
    expect(outdoorDistanceM(ride('2026-11-02', 1, null, false))).toBe(0);
    expect(outdoorElevationGainM(ride('2026-11-02', 1, 30, false, 400))).toBe(400);
    expect(outdoorElevationGainM(ride('2026-11-02', 1, 30, true, 400))).toBe(0);
    expect(outdoorElevationGainM(ride('2026-11-02', 1, 30, false, null))).toBe(0);
  });
});

describe('wattsPerKg', () => {
  it('divides FTP by weight', () => {
    expect(wattsPerKg(199, 79.6)).toBeCloseTo(2.5, 5);
  });
  it('is null when an input is missing or invalid', () => {
    expect(wattsPerKg(199, null)).toBeNull();
    expect(wattsPerKg(null, 70)).toBeNull();
    expect(wattsPerKg(199, 0)).toBeNull();
  });
});
