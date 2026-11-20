import { describe, expect, it } from 'vitest';
import type { ActivityStreams } from '@/shared/api/client';
import { alignedPoints, canAlignByDistance, hasChannelData } from './alignedPoints';

const stream = (channels: Partial<ActivityStreams>): ActivityStreams => ({
  schemaVersion: 3,
  time: [0, 1, 2],
  power: null,
  hr: null,
  cadence: null,
  speed: null,
  altitude: null,
  distance: null,
  lat: null,
  lng: null,
  laps: null,
  ...channels,
});

describe('aligned points', () => {
  it('aligns by distance in km when both rides have it', () => {
    const withDistance = stream({ distance: [0, 500, 1000], speed: [5, null, 6] });
    expect(canAlignByDistance(withDistance, withDistance)).toBe(true);
    expect(canAlignByDistance(withDistance, stream({}))).toBe(false);
    expect(alignedPoints(withDistance, 'speed', true, 3.6)).toEqual([
      [0, 18],
      [1, 21.6],
    ]);
  });

  it('falls back to seconds', () => {
    expect(alignedPoints(stream({ hr: [120, 130, null] }), 'hr', false)).toEqual([
      [0, 120],
      [1, 130],
    ]);
    expect(alignedPoints(stream({}), 'power', false)).toEqual([]);
  });

  it('checks for real readings', () => {
    expect(hasChannelData(stream({ power: [0, null, 0] }), 'power')).toBe(false);
    expect(hasChannelData(stream({ power: [0, 150, 0] }), 'power')).toBe(true);
  });
});
