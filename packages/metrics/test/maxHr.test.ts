import { describe, expect, it } from 'vitest';
import { maxHrByYear, peakHr } from '../src/index.js';

const seconds = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('peakHr', () => {
  it('keeps a short true peak that a 30-second average would dilute', () => {
    // A sprint finish: 2 min at 170, 8 s at the top (188), then easing off.
    const hr = [...Array(120).fill(170), ...Array(8).fill(188), ...Array(60).fill(150)];
    expect(peakHr(seconds(hr.length), hr)).toBe(188);
    expect(peakHr(seconds(hr.length), hr, 30)).toBeLessThan(180);
  });

  it('averages away a one-second strap glitch', () => {
    const hr = [...Array(100).fill(160), 200, ...Array(100).fill(160)];
    expect(peakHr(seconds(hr.length), hr)).toBe(168); // (4 × 160 + 200) / 5
  });

  it('drops implausible readings and needs at least 5 s of data', () => {
    const hr = [...Array(100).fill(160), 255, 255, ...Array(100).fill(160)];
    expect(peakHr(seconds(hr.length), hr)).toBe(160);
    expect(peakHr(seconds(4), Array(4).fill(170))).toBeNull();
    expect(peakHr(seconds(60), Array(60).fill(null))).toBeNull();
  });
});

describe('maxHrByYear', () => {
  const a = (id: string, date: string, hrPeak5s: number | null, maxHr: number | null, sport = 'cycling') => ({
    id,
    date,
    name: `A${id}`,
    sport,
    isCycling: sport === 'cycling',
    hrPeak5s,
    maxHr,
  });
  it('takes the best 5-second value per year from rides only, plus the highest single reading', () => {
    const years = maxHrByYear([
      a('1', '2025-03-01', 175, 182),
      a('2', '2025-07-01', 179, 205, 'running'), // runs count for neither value
      a('3', '2025-08-01', null, 199), // a spike without a usable stream
      a('4', '2026-01-10', 170, 240), // 240 is a sensor error
      a('5', '2026-02-01', 185, 190, 'running'),
    ]);
    expect(years).toEqual([
      { year: 2025, bpm: 175, id: '1', date: '2025-03-01', name: 'A1', sport: 'cycling', peakBpm: 199 },
      { year: 2026, bpm: 170, id: '4', date: '2026-01-10', name: 'A4', sport: 'cycling', peakBpm: null },
    ]);
  });
});
