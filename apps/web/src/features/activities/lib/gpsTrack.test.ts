import { describe, expect, it } from 'vitest';
import { gpsTrack, nearestPointIndex } from './gpsTrack';
import { testStream } from './testStream';

describe('gpsTrack', () => {
  it('keeps records with both coordinates', () => {
    const stream = testStream({ time: [0, 1, 2, 3], lat: [60.1, null, 60.2, 60.3], lng: [24.9, 25, null, 25.1] });
    expect(gpsTrack(stream)).toEqual({
      times: [0, 3],
      coordinates: [
        [24.9, 60.1],
        [25.1, 60.3],
      ],
    });
  });

  it('is empty without GPS', () => {
    expect(gpsTrack(testStream({ time: [0, 1] }))).toEqual({ times: [], coordinates: [] });
  });
});

describe('nearestPointIndex', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 0 },
  ];
  const project = (i: number) => points[i]!;

  it('finds the nearest point within the radius', () => {
    expect(nearestPointIndex(3, project, { x: 12, y: 3 }, 24)).toBe(1);
    expect(nearestPointIndex(3, project, { x: 20, y: 24 }, 24)).toBe(2);
  });

  it('returns null when nothing is close enough', () => {
    expect(nearestPointIndex(3, project, { x: 50, y: 50 }, 24)).toBeNull();
    expect(nearestPointIndex(0, project, { x: 0, y: 0 }, 24)).toBeNull();
  });
});
