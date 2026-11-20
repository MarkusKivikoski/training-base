import { describe, expect, it } from 'vitest';
import {
  bestDistanceEfforts,
  cleanDistance,
  MAX_PLAUSIBLE_RUN_SPEED_MPS,
  maxSustainedSpeed,
  periodTotals,
  streaks,
  streamMovingTime,
  topN,
  type VolumeInput,
} from '../src/index.js';

const seconds = (n: number) => Array.from({ length: n + 1 }, (_, i) => i);

describe('bestDistanceEfforts', () => {
  it('times a constant 10 m/s ride: 1 km in 100 s, 5 km in 500 s, longer distances null', () => {
    const time = seconds(600); // 6 km
    const distance = time.map((t) => t * 10);
    expect(bestDistanceEfforts(time, distance, [1000, 5000, 10000])).toEqual([100, 500, null]);
  });

  it('finds the fastest stretch, and counts a stop inside it (elapsed time)', () => {
    // 0–100 s at 5 m/s (500 m), then 100–200 s at 20 m/s (2 km): the best 1 km is in the fast part.
    const time = seconds(200);
    const distance = time.map((t) => (t <= 100 ? t * 5 : 500 + (t - 100) * 20));
    expect(bestDistanceEfforts(time, distance, [1000])).toEqual([50]);

    // A 60 s stop (time jumps, distance doesn't) in the middle of the only 1 km stretch.
    const t2 = [0, 50, 110, 160];
    const d2 = [0, 500, 500, 1000];
    expect(bestDistanceEfforts(t2, d2, [1000])).toEqual([160]);
  });

  it('skips null samples, and a reset adds nothing', () => {
    // 0 → 20 (+20), reset to 5 (+0), 5 → 25 (+20): 40 m in total.
    expect(cleanDistance([0, 1, 2, 3, 4], [0, null, 20, 5, 25]).d).toEqual([0, 20, 20, 40]);
    expect(bestDistanceEfforts([0, 1, 2, 3, 4], [0, null, 20, 5, 25], [40])).toEqual([4]);
  });

  it('ignores impossible distance jumps (GPS glitches), so they cannot make a fake record', () => {
    // 10 m/s riding with a 2 km jump in one second at t = 50.
    const time = seconds(200);
    const distance = time.map((t) => t * 10 + (t >= 50 ? 2000 : 0));
    expect(bestDistanceEfforts(time, distance, [1000])).toEqual([100]);
  });

  it('takes a lower glitch limit for runs: a 15 m/s stretch is real on a bike, a glitch on foot', () => {
    // 4 m/s running at 10 s samples, with 150 m covered in the ten seconds before t = 50.
    const time = Array.from({ length: 61 }, (_, i) => i * 10);
    const distance = time.map((t) => t * 4 + (t >= 50 ? 110 : 0));
    expect(bestDistanceEfforts(time, distance, [1000])).toEqual([230]);
    expect(bestDistanceEfforts(time, distance, [1000], MAX_PLAUSIBLE_RUN_SPEED_MPS)).toEqual([250]);
  });
});

describe('streamMovingTime', () => {
  it('counts time moving and leaves out stops and long gaps', () => {
    // 10 s moving, 10 s stopped (speed 0), a 60 s gap, then 5 s moving.
    const time = [...seconds(20), ...[80, 81, 82, 83, 84, 85]];
    const speed = time.map((t) => (t < 10 || t >= 80 ? 8 : 0));
    expect(streamMovingTime(time, speed)).toBe(15);
  });
});

describe('maxSustainedSpeed', () => {
  it('ignores a one-second spike', () => {
    const time = seconds(20);
    const speed = time.map((t) => (t === 10 ? 22 : 10)); // a one-sample spike under the 90 km/h cap
    const v = maxSustainedSpeed(time, speed, 3)!;
    expect(v).toBeLessThan(15); // (22 + 10 + 10) / 3
    expect(v).toBeGreaterThan(10);
  });

  it('drops implausible samples above 90 km/h even when they last several seconds', () => {
    const time = seconds(30);
    const speed = time.map((t) => (t >= 10 && t < 20 ? 48 : 12));
    expect(maxSustainedSpeed(time, speed, 3)).toBeCloseTo(12, 6);
  });

  it('returns the steady speed of a steady ride, and null for too little data', () => {
    expect(
      maxSustainedSpeed(
        seconds(10),
        seconds(10).map(() => 12),
        3,
      ),
    ).toBeCloseTo(12, 6);
    expect(maxSustainedSpeed([0, 1], [10, 10], 3)).toBeNull();
  });

  it('does not bridge a long pause', () => {
    expect(maxSustainedSpeed([0, 1, 100, 101], [10, 10, 10, 10], 3)).toBeNull();
  });
});

describe('topN', () => {
  it('keeps the n best, ties going to the earlier date, and supports lowest-first', () => {
    const items = [
      { date: '2026-02-01', v: 5 },
      { date: '2026-01-01', v: 5 },
      { date: '2026-03-01', v: 9 },
      { date: '2026-04-01', v: null },
    ];
    expect(topN(items, (x) => x.v, 2).map((x) => x.date)).toEqual(['2026-03-01', '2026-01-01']);
    expect(topN(items, (x) => x.v, 1, true).map((x) => x.date)).toEqual(['2026-01-01']);
  });
});

describe('periodTotals', () => {
  const ride = (date: string, hours: number, km: number, elev: number): VolumeInput => ({
    date,
    durationS: hours * 3600,
    movingDurationS: hours * 3600,
    distanceM: km * 1000,
    elevationGainM: elev,
    isIndoor: false,
  });
  const rides = [ride('2025-12-29', 1, 20, 100), ride('2026-01-02', 2, 50, 300), ride('2026-01-10', 1, 25, 50)];

  it('sums per ISO week, month and year', () => {
    expect(periodTotals(rides, 'week').map((p) => [p.date, p.hours])).toEqual([
      ['2025-12-29', 3], // Mon 29 Dec and Fri 2 Jan are the same ISO week
      ['2026-01-05', 1],
    ]);
    expect(periodTotals(rides, 'month').map((p) => [p.date, p.distanceKm])).toEqual([
      ['2025-12', 20],
      ['2026-01', 75],
    ]);
    expect(
      periodTotals(rides, 'week')
        .map((p) => p.rides)
        .reduce((a, b) => a + b, 0),
    ).toBe(rides.length);
    expect(periodTotals(rides, 'year').map((p) => [p.date, p.elevationM])).toEqual([
      ['2025', 100],
      ['2026', 350],
    ]);
  });
});

describe('streaks', () => {
  it('finds the longest day and week streaks across a year boundary, and current streaks', () => {
    const s = streaks(
      ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-03', '2026-01-04', '2026-01-04'],
      '2026-01-05',
    );
    expect(s.days).toEqual({ length: 3, from: '2025-12-30', to: '2026-01-01' });
    expect(s.weeks).toEqual({ length: 1, from: '2025-12-29', to: '2025-12-29' }); // all in one ISO week
    // Rode yesterday (4 Jan): the 3–4 Jan run is still current.
    expect(s.currentDays).toEqual({ length: 2, from: '2026-01-03', to: '2026-01-04' });
    // This ISO week (from 5 Jan) has no ride yet, but last week did.
    expect(s.currentWeeks).toEqual({ length: 1, from: '2025-12-29', to: '2025-12-29' });
  });

  it('has no current streak after a break', () => {
    const s = streaks(['2026-01-01'], '2026-01-20'); // two weeks later
    expect(s.currentDays).toBeNull();
    expect(s.currentWeeks).toBeNull();
  });
});
