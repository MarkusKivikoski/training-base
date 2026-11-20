import { describe, expect, it } from 'vitest';
import { totalZoneSeconds, zoneRows, type ZoneSet } from './zoneRows';

const ZONES = [
  { name: 'Easy', lower: 0 },
  { name: 'Hard', lower: 0.5 },
];

const set = (seconds: number[]): ZoneSet => ({
  threshold: 200,
  thresholdFrom: '2026-10-27',
  backApplied: false,
  seconds,
});

describe('zone rows', () => {
  it('gives each zone its range, share and bar length', () => {
    const [easy, hard] = zoneRows(set([300, 100]), ZONES);
    expect(easy).toEqual({ number: 1, name: 'Easy', range: '0–99', seconds: 300, percent: 75, barPercent: 100 });
    expect(hard).toMatchObject({ number: 2, name: 'Hard', range: '100+', seconds: 100, percent: 25 });
    expect(hard!.barPercent).toBeCloseTo(33.33, 2);
    expect(totalZoneSeconds(set([300, 100]))).toBe(400);
  });

  it('handles a ride with no counted time', () => {
    const rows = zoneRows(set([]), ZONES);
    expect(rows.map((row) => [row.seconds, row.percent, row.barPercent])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });
});
