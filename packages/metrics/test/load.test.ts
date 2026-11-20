import { describe, expect, it } from 'vitest';
import { dailyLoad, eftp, estimateLthr, hrSegments, hrTss, MEAN_MAX_DURATIONS_S, powerSegments } from '../src/index.js';

const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => start + i);

describe('hrSegments', () => {
  it('skips records without heart rate instead of counting them as zero', () => {
    expect(hrSegments([0, 1, 2, 3], [120, null, 122, 0])).toEqual([[120, 121, 122]]);
  });

  it('holds the last value across 4-30 s gaps and splits at longer ones', () => {
    expect(hrSegments([0, 5], [130, 140])).toEqual([[130, 130, 130, 130, 130, 140]]);
    expect(hrSegments([0, 40], [130, 140])).toEqual([[130], [140]]);
  });

  it('leaves powerSegments behaviour unchanged (zero fill)', () => {
    expect(powerSegments([0, 5], [100, 100])).toEqual([[100, 0, 0, 0, 0, 100]]);
  });
});

describe('hrTss', () => {
  it('gives 100 for one hour at LTHR and 50 for half an hour', () => {
    expect(hrTss([Array(3600).fill(170)], 170)).toBeCloseTo(100, 10);
    expect(hrTss([Array(1800).fill(170)], 170)).toBeCloseTo(50, 10);
  });

  it('scales with the square of the intensity ratio', () => {
    expect(hrTss([Array(3600).fill(136)], 170)).toBeCloseTo(0.8 ** 2 * 100, 10);
  });

  it('ignores seconds below 50% of LTHR', () => {
    expect(hrTss([Array(3600).fill(84)], 170)).toBe(0);
    expect(hrTss([[...Array(1800).fill(80), ...Array(1800).fill(170)]], 170)).toBeCloseTo(50, 10);
  });
});

describe('estimateLthr', () => {
  it('averages heart rate over the best 20-minute power window and takes 95%', () => {
    // 10 min easy, 20 min test at 200 W / 170 bpm, 10 min easy.
    const time = range(2400);
    const power = time.map((t) => (t >= 600 && t < 1800 ? 200 : 100));
    const hr = time.map((t) => (t >= 600 && t < 1800 ? 170 : 120));
    const est = estimateLthr(time, power, hr)!;
    expect(est.windowStartS).toBe(600);
    expect(est.avgPower).toBe(200);
    expect(est.avgHr).toBe(170);
    expect(est.lthr).toBeCloseTo(161.5, 10);
  });

  it('is null for rides shorter than 20 minutes or without heart rate', () => {
    expect(estimateLthr(range(1000), Array(1000).fill(200), Array(1000).fill(150))).toBeNull();
    expect(estimateLthr(range(1500), Array(1500).fill(200), Array(1500).fill(null))).toBeNull();
  });
});

describe('dailyLoad', () => {
  it('matches the CLAUDE.md formulas, including rest days', () => {
    const days = dailyLoad([{ date: '2026-11-01', tss: 100 }], { from: '2026-11-01', to: '2026-11-03' });
    expect(days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(days.map((d) => d.tss)).toEqual([100, 0, 0]);

    const [d1, d2, d3] = days;
    expect(d1!.ctl).toBeCloseTo(100 / 42, 10); // 2.381
    expect(d1!.atl).toBeCloseTo(100 / 7, 10); // 14.286
    expect(d1!.tsb).toBe(0); // yesterday's CTL − ATL, both 0
    expect(d2!.ctl).toBeCloseTo(d1!.ctl * (41 / 42), 10);
    expect(d2!.atl).toBeCloseTo(d1!.atl * (6 / 7), 10);
    expect(d2!.tsb).toBeCloseTo(d1!.ctl - d1!.atl, 10);
    expect(d3!.tsb).toBeCloseTo(d2!.ctl - d2!.atl, 10);
  });

  it('sums several activities on the same day', () => {
    const [d] = dailyLoad(
      [
        { date: '2026-11-01', tss: 40 },
        { date: '2026-11-01', tss: 60 },
      ],
      { from: '2026-11-01', to: '2026-11-01' },
    );
    expect(d!.tss).toBe(100);
  });

  it('converges to the daily TSS when it is constant', () => {
    const entries = range(400).map((i) => ({
      date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
      tss: 50,
    }));
    const days = dailyLoad(entries, { from: entries[0]!.date, to: entries.at(-1)!.date });
    expect(days.at(-1)!.ctl).toBeCloseTo(50, 2);
    expect(days.at(-1)!.atl).toBeCloseTo(50, 6);
  });
});

describe('eftp', () => {
  const i20 = MEAN_MAX_DURATIONS_S.indexOf(1200);
  const ride = (id: string, date: string, p20: number) => {
    const mmp: (number | null)[] = MEAN_MAX_DURATIONS_S.map(() => null);
    mmp[i20] = p20;
    return { id, date, meanMaxPower: mmp };
  };

  it('is 95% of the best 20-minute power in the 90 days ending the date', () => {
    const rides = [ride('1', '2026-07-01', 260), ride('2', '2026-10-27', 209), ride('3', '2026-11-02', 200)];
    expect(eftp(rides, '2026-11-05')).toBeCloseTo(209 * 0.95, 10);
    // 2026-07-01 is outside the window; on 2026-08-01 it is inside.
    expect(eftp(rides, '2026-08-01')).toBeCloseTo(260 * 0.95, 10);
  });

  it('is null without rides in the window', () => {
    expect(eftp([ride('1', '2026-01-01', 250)], '2026-11-05')).toBeNull();
  });
});
