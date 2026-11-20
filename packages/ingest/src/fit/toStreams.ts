import { STREAM_SCHEMA_VERSION, type ActivityStream } from '@app/shared';
import type { FitLap, FitSample } from './parseFit.js';

const round = (v: number | null, digits: number) => {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

type ChannelKey = 'power' | 'hr' | 'cadence' | 'speed' | 'altitude' | 'distance' | 'lat' | 'lng';

// Rounding keeps files small and output deterministic, well below sensor precision.
const CHANNELS: ReadonlyArray<[ChannelKey, number]> = [
  ['power', 0],
  ['hr', 0],
  ['cadence', 0],
  ['speed', 3],
  ['altitude', 1],
  ['distance', 1],
  ['lat', 6],
  ['lng', 6],
];

/**
 * Turns decoded samples into columnar per-second streams. Samples are ordered by time,
 * and several records in the same second collapse to the last one. Seconds without a
 * record are left out; gap handling belongs to the metrics, not the stored data.
 */
export function toStreams(samples: readonly FitSample[], fitLaps: readonly FitLap[] = []): ActivityStream {
  const bySecond = new Map<number, FitSample>();
  for (const s of [...samples].sort((a, b) => a.t - b.t)) bySecond.set(s.t, s);
  const ordered = [...bySecond.values()];
  const t0 = ordered[0]?.t ?? 0;

  const stream: ActivityStream = {
    schemaVersion: STREAM_SCHEMA_VERSION,
    time: ordered.map((s) => s.t - t0),
    power: null,
    hr: null,
    cadence: null,
    speed: null,
    altitude: null,
    distance: null,
    lat: null,
    lng: null,
    laps: null,
  };
  for (const [key, digits] of CHANNELS) {
    const values = ordered.map((s) => round(s[key], digits));
    stream[key] = values.some((v) => v !== null) ? values : null;
  }
  if (fitLaps.length > 0) {
    stream.laps = fitLaps
      .map((l) => ({
        startS: Math.max(0, l.t - t0),
        endS: Math.max(0, Math.round(l.t - t0 + l.elapsedS)),
        trigger: l.trigger,
      }))
      .sort((a, b) => a.startS - b.startS);
  }
  return stream;
}
