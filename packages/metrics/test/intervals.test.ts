import { describe, expect, it } from 'vitest';
import { detectIntervals, perSecond, rangeStats } from '../src/index.js';

const seconds = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('perSecond', () => {
  it('bridges short gaps and leaves pauses empty', () => {
    const p = perSecond([0, 3, 50], [100, 200, 300], { fill: 'zero' });
    expect(p.slice(0, 4)).toEqual([100, 0, 0, 200]);
    expect(Number.isNaN(p[10]!)).toBe(true); // 3 → 50 is a 47 s pause
    expect(perSecond([0, 3], [100, 200], { fill: 'hold' }).slice(0, 4)).toEqual([100, 100, 100, 200]);
  });
});

describe('detectIntervals', () => {
  // A workout at FTP 200: 300 s easy (120 W), 3 × (120 s at 240 W + 120 s at 120 W), 300 s easy.
  const watts = [
    ...Array(300).fill(120),
    ...[0, 1, 2].flatMap(() => [...Array(120).fill(240), ...Array(120).fill(120)]),
    ...Array(300).fill(120),
  ];
  const time = seconds(watts.length);

  it('finds each work block, with edges close to the real ones', () => {
    const iv = detectIntervals(time, watts, 200);
    expect(iv).toHaveLength(3);
    iv.forEach((r, k) => {
      const realStart = 300 + k * 240;
      expect(Math.abs(r.startS - realStart)).toBeLessThanOrEqual(10);
      expect(Math.abs(r.endS - (realStart + 120))).toBeLessThanOrEqual(10);
    });
  });

  it('merges short dips, drops efforts under 30 s, and finds nothing on an easy ride', () => {
    const dip = [...Array(100).fill(240), ...Array(10).fill(100), ...Array(100).fill(240)];
    expect(detectIntervals(seconds(dip.length), dip, 200)).toHaveLength(1);
    const short = [...Array(200).fill(100), ...Array(15).fill(400), ...Array(200).fill(100)];
    expect(detectIntervals(seconds(short.length), short, 200)).toEqual([]);
    expect(detectIntervals(seconds(600), Array(600).fill(150), 200)).toEqual([]);
  });

  it('keeps a steady effort hovering at the threshold as one interval', () => {
    // 20 min mostly at 215 W (FTP 200, threshold 176), with three 40 s sags to 165 W.
    const sag = (n: number) => Array(n).fill(165);
    const block = [
      ...Array(300).fill(215),
      ...sag(40),
      ...Array(300).fill(215),
      ...sag(40),
      ...Array(300).fill(215),
      ...sag(40),
      ...Array(180).fill(215),
    ];
    const w = [...Array(300).fill(110), ...block, ...Array(300).fill(110)];
    const iv = detectIntervals(seconds(w.length), w, 200);
    expect(iv).toHaveLength(1);
    expect(iv[0]!.endS - iv[0]!.startS).toBeGreaterThan(1150);
  });

  it('does not join efforts across a pause', () => {
    const t = [...seconds(100), ...seconds(100).map((s) => s + 160)];
    const w = Array(200).fill(250);
    expect(detectIntervals(t, w, 200)).toHaveLength(2);
  });
});

describe('rangeStats', () => {
  it('summarises a part of a ride', () => {
    const time = seconds(120);
    const s = rangeStats(
      {
        time,
        power: time.map((t) => (t < 60 ? 100 : 300)),
        hr: time.map((t) => 120 + Math.floor(t / 2)),
        cadence: time.map((t) => (t % 10 === 0 ? 0 : 90)),
        distance: time.map((t) => t * 10),
      },
      { startS: 60, endS: 120 },
    );
    expect(s).toMatchObject({
      durationS: 60,
      avgPower: 300,
      maxPower: 300,
      avgCadence: 90,
      distanceM: 590,
      maxHr: 179,
    });
    expect(s.np).toBeCloseTo(300, 6);
    expect(s.avgSpeed).toBeCloseTo(590 / 60, 6);
  });

  it('returns nulls for channels the ride lacks', () => {
    const s = rangeStats(
      { time: seconds(10), power: null, hr: null, cadence: null, distance: null },
      { startS: 0, endS: 10 },
    );
    expect(s).toMatchObject({ avgPower: null, np: null, avgHr: null, distanceM: null, avgSpeed: null });
  });
});
