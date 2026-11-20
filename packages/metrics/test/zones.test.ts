import { describe, expect, it } from 'vitest';
import { HR_ZONES, lowZoneShare, POWER_ZONES, timeInZones, zoneBounds, zoneIndex } from '../src/index.js';

describe('zoneIndex', () => {
  it('puts boundary values in the higher zone', () => {
    expect(zoneIndex(112, 200, POWER_ZONES)).toBe(1); // exactly 56%
    expect(zoneIndex(111.9, 200, POWER_ZONES)).toBe(0);
    expect(zoneIndex(0, 200, POWER_ZONES)).toBe(0); // coasting
    expect(zoneIndex(210, 200, POWER_ZONES)).toBe(3); // 105%
    expect(zoneIndex(212, 200, POWER_ZONES)).toBe(4); // 106%
    expect(zoneIndex(1000, 200, POWER_ZONES)).toBe(6);
  });

  it('works for heart rate against LTHR', () => {
    expect(zoneIndex(100, 155, HR_ZONES)).toBe(0); // 64.5%
    expect(zoneIndex(140, 155, HR_ZONES)).toBe(2); // 90.3%
    expect(zoneIndex(155, 155, HR_ZONES)).toBe(3);
    expect(zoneIndex(165, 155, HR_ZONES)).toBe(4); // 106.5%
  });
});

describe('timeInZones', () => {
  it('counts seconds per zone and sums to the segment duration', () => {
    const segments = [
      [0, 0, 100, 150],
      [200, 250, 400],
    ];
    const s = timeInZones(segments, 200, POWER_ZONES);
    // 0,0,100 -> Z1; 150 (75%) -> Z2; 200 (100%) -> Z4; 250 (125%) -> Z6; 400 (200%) -> Z7
    expect(s).toEqual([3, 1, 0, 1, 0, 1, 1]);
    expect(s.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it('is all zeros for no data', () => {
    expect(timeInZones([], 155, HR_ZONES)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('zoneBounds', () => {
  it('gives whole-unit ranges with an open top zone', () => {
    expect(zoneBounds(199, POWER_ZONES)).toEqual([
      { min: 0, max: 111 },
      { min: 112, max: 151 },
      { min: 152, max: 181 },
      { min: 182, max: 210 },
      { min: 211, max: 240 },
      { min: 241, max: 300 },
      { min: 301, max: null },
    ]);
    expect(zoneBounds(155, HR_ZONES).map((b) => b.min)).toEqual([0, 107, 131, 148, 165]);
  });
});

describe('lowZoneShare', () => {
  it('sums Z1–Z2 time over activities against all zoned time', () => {
    const rides = [
      [600, 1200, 300, 0, 0, 0, 0],
      [0, 900, 600, 300, 0, 0, 0],
    ];
    expect(lowZoneShare(rides)).toEqual({ lowS: 2700, totalS: 3900 });
  });

  it('can count a different number of low zones', () => {
    expect(lowZoneShare([[100, 100, 100, 100, 100]], 3)).toEqual({ lowS: 300, totalS: 500 });
  });

  it('is null without zoned time', () => {
    expect(lowZoneShare([])).toBeNull();
    expect(lowZoneShare([[0, 0, 0, 0, 0]])).toBeNull();
  });
});
