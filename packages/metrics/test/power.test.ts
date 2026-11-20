import { describe, expect, it } from 'vitest';
import {
  combineMeanMax,
  intensityFactor,
  MEAN_MAX_DURATIONS_S,
  meanMaxPower,
  normalizedPower,
  powerSegments,
  segmentsDuration,
  trainingStressScore,
} from '../src/index.js';

const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => start + i);
const constant = (watts: number, seconds: number) => [Array.from({ length: seconds }, () => watts)];

/** Naive reference NP, written independently of the optimized implementation. */
function referenceNp(segments: number[][]): number | null {
  const avgs: number[] = [];
  for (const s of segments) {
    for (let end = 29; end < s.length; end++) {
      let sum = 0;
      for (let k = end - 29; k <= end; k++) sum += s[k]!;
      avgs.push(sum / 30);
    }
  }
  if (avgs.length === 0) return null;
  return (avgs.reduce((n, a) => n + a ** 4, 0) / avgs.length) ** 0.25;
}

describe('powerSegments', () => {
  it('keeps contiguous 1 Hz data as one segment and treats missing power as 0 W', () => {
    expect(powerSegments([0, 1, 2, 3], [100, null, 200, -5])).toEqual([[100, 0, 200, 0]]);
  });

  it('interpolates recording gaps up to 3 s', () => {
    expect(powerSegments([0, 3], [100, 400])).toEqual([[100, 200, 300, 400]]);
  });

  it('zero-fills gaps from 4 to 30 s', () => {
    const [seg] = powerSegments([0, 10], [200, 200]);
    expect(seg).toEqual([200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200]);
    expect(powerSegments([0, 30], [100, 100])[0]).toHaveLength(31);
  });

  it('splits at gaps longer than 30 s', () => {
    expect(powerSegments([0, 1, 32, 33], [100, 100, 300, 300])).toEqual([
      [100, 100],
      [300, 300],
    ]);
  });

  it('skips duplicate and out-of-order timestamps', () => {
    expect(powerSegments([0, 1, 1, 0, 2], [10, 20, 99, 99, 30])).toEqual([[10, 20, 30]]);
  });

  it('handles empty input', () => {
    expect(powerSegments([], [])).toEqual([]);
  });

  it('accepts custom thresholds', () => {
    expect(powerSegments([0, 5], [100, 100], { maxGapS: 4 })).toEqual([[100], [100]]);
  });
});

describe('normalizedPower', () => {
  it('equals the power for a constant ride', () => {
    expect(normalizedPower(constant(200, 600))).toBeCloseTo(200, 10);
  });

  it('is null when no segment reaches 30 s', () => {
    expect(normalizedPower(constant(300, 29))).toBeNull();
    expect(normalizedPower([[...constant(300, 20)[0]!], [...constant(300, 20)[0]!]])).toBeNull();
  });

  it('skips the first 29 s of each segment (trailing window)', () => {
    // 29 s of 1000 W then 30 s of 100 W: the first full window still includes 29 s at 1000 W.
    const seg = [...Array(29).fill(1000), ...Array(30).fill(100)];
    expect(normalizedPower([seg])).toBeCloseTo(referenceNp([seg])!, 10);
  });

  it('matches the reference for an on/off interval pattern', () => {
    // 20 s at 400 W, 40 s at 100 W, for an hour.
    const seg = range(3600).map((i) => (i % 60 < 20 ? 400 : 100));
    const np = normalizedPower([seg])!;
    expect(np).toBeCloseTo(referenceNp([seg])!, 8);
    // NP sits above the average (200 W) for variable riding.
    expect(np).toBeGreaterThan(200);
    expect(np).toBeLessThan(400);
  });

  it('does not let windows span segments', () => {
    const a = Array(40).fill(300);
    const b = Array(40).fill(100);
    expect(normalizedPower([a, b])).toBeCloseTo(referenceNp([a, b])!, 10);
  });
});

describe('meanMaxPower', () => {
  it('returns the constant power for every duration the ride covers', () => {
    const mmp = meanMaxPower(constant(200, 600));
    MEAN_MAX_DURATIONS_S.forEach((d, i) => {
      expect(mmp[i]).toBe(d <= 600 ? 200 : null);
    });
  });

  it('finds the best window', () => {
    const seg = [...Array(100).fill(150), ...Array(5).fill(600), ...Array(100).fill(150)];
    const [p1, p5, p10] = meanMaxPower([seg]);
    expect(p1).toBe(600);
    expect(p5).toBe(600);
    expect(p10).toBe(375);
  });

  it('never spans a pause', () => {
    const [, p5] = meanMaxPower(
      [
        [500, 500, 500],
        [500, 500, 500],
      ],
      [1, 5],
    );
    expect(p5).toBeNull();
  });
});

describe('IF and TSS', () => {
  it('gives IF 1.0 and TSS 100 for one hour at FTP', () => {
    expect(intensityFactor(199, 199)).toBe(1);
    expect(trainingStressScore(3600, 199, 199)).toBeCloseTo(100, 10);
  });

  it('scales with duration and the square of IF', () => {
    expect(trainingStressScore(1800, 150, 200)).toBeCloseTo(0.5 * 0.75 ** 2 * 100, 10);
  });

  it('counts zero-filled seconds in riding time', () => {
    expect(segmentsDuration(powerSegments([0, 10, 50], [100, 100, 100]))).toBe(12);
  });
});

describe('combineMeanMax', () => {
  it('takes the element-wise maximum and remembers the source ride', () => {
    const curve = combineMeanMax(
      [
        { id: '1', date: '2026-10-01', name: 'A', meanMaxPower: [500, 300, null] },
        { id: '2', date: '2026-10-05', name: 'B', meanMaxPower: [450, 320, 250] },
        { id: '3', date: '2026-10-09', meanMaxPower: null },
      ],
      [1, 5, 10],
    );
    expect(curve).toEqual([
      { durationS: 1, watts: 500, activityId: '1', date: '2026-10-01', name: 'A' },
      { durationS: 5, watts: 320, activityId: '2', date: '2026-10-05', name: 'B' },
      { durationS: 10, watts: 250, activityId: '2', date: '2026-10-05', name: 'B' },
    ]);
  });

  it('keeps the earlier ride on ties and omits durations nobody reached', () => {
    const curve = combineMeanMax(
      [
        { id: '9', date: '2026-10-09', meanMaxPower: [300, null] },
        { id: '1', date: '2026-10-01', meanMaxPower: [300, null] },
      ],
      [1, 5],
    );
    expect(curve).toEqual([{ durationS: 1, watts: 300, activityId: '1', date: '2026-10-01' }]);
  });
});
