import type { ActivityStreams } from '@/shared/api/client';

/** A stream for tests: every channel empty unless given. */
export const testStream = (channels: Partial<ActivityStreams> = {}): ActivityStreams => ({
  schemaVersion: 3,
  time: [],
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
