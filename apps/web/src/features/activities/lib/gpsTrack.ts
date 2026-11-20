import type { ActivityStreams } from '@/shared/api/client';

/** The ride's GPS points: `times[i]` is the second into the ride of `coordinates[i]` ([lng, lat]). */
export type GpsTrack = {
  times: number[];
  coordinates: Array<[number, number]>;
};

/** The records that have both latitude and longitude, in time order. */
export const gpsTrack = (stream: ActivityStreams): GpsTrack => {
  const track: GpsTrack = { times: [], coordinates: [] };
  const { lat, lng, time } = stream;
  if (!lat || !lng) return track;

  for (let i = 0; i < time.length; i++) {
    const latitude = lat[i];
    const longitude = lng[i];
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
    track.times.push(time[i]!);
    track.coordinates.push([longitude, latitude]);
  }
  return track;
};

type ScreenPoint = { x: number; y: number };

/**
 * The index of the point nearest to `target` on screen, if it lies within `radiusPx`; otherwise
 * null. `project` gives a point's screen position, so only one is computed at a time.
 */
export const nearestPointIndex = (
  count: number,
  project: (index: number) => ScreenPoint,
  target: ScreenPoint,
  radiusPx: number,
): number | null => {
  let nearest: number | null = null;
  let nearestDistanceSquared = Infinity;

  for (let i = 0; i < count; i++) {
    const point = project(i);
    const distanceSquared = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
    if (distanceSquared < nearestDistanceSquared) {
      nearest = i;
      nearestDistanceSquared = distanceSquared;
    }
  }

  const isWithinRadius = nearestDistanceSquared <= radiusPx ** 2;
  return isWithinRadius ? nearest : null;
};
