import { Decoder, Stream } from '@garmin/fitsdk';
import { z } from 'zod';

export class FitParseError extends Error {
  override readonly name = 'FitParseError';
}

/**
 * A valid FIT file with no record messages: what Garmin serves for activities entered by hand,
 * and for recordings stopped right after starting. There is nothing to parse, which isn't a fault.
 */
export class FitNoRecordsError extends FitParseError {}

/** One record message, with units converted. Missing values are null. */
export interface FitSample {
  /** Unix time, seconds. */
  t: number;
  power: number | null;
  hr: number | null;
  cadence: number | null;
  /** m/s */
  speed: number | null;
  /** metres */
  altitude: number | null;
  /** Cumulative distance from the device, metres. */
  distance: number | null;
  /** degrees */
  lat: number | null;
  /** degrees */
  lng: number | null;
}

const optNum = z.number().finite().nullish();

// Boundary validation of the decoder's record output. Field names were checked against
// the 19 real files (2026-11-05): Edge 1030 and Venu 2 recordings. `distance` is metres and
// its last value matches Garmin's summary distance (checked 2026-11-06).
const recordSchema = z
  .object({
    timestamp: z.union([z.date(), z.number()]),
    power: optNum,
    heartRate: optNum,
    cadence: optNum,
    speed: optNum,
    enhancedSpeed: optNum,
    altitude: optNum,
    enhancedAltitude: optNum,
    distance: optNum,
    positionLat: optNum,
    positionLong: optNum,
  })
  .loose();

const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;
const n = (v: number | null | undefined) => (typeof v === 'number' ? v : null);

/** A lap as recorded by the device: when it started and how long it ran (elapsed). */
export interface FitLap {
  /** Unix time, seconds. */
  t: number;
  elapsedS: number;
  /** Why the lap ended: "manual", "distance", "sessionEnd", … */
  trigger: string | null;
}

const lapSchema = z
  .object({
    startTime: z.union([z.date(), z.number()]),
    totalElapsedTime: z.number().finite(),
    lapTrigger: z.string().nullish(),
  })
  .loose();

/** Decodes a FIT file's record messages. Throws FitParseError if nothing usable is in it. */
export function parseFit(bytes: Uint8Array): FitSample[] {
  return decodeFit(bytes).samples;
}

/** Records and laps from one decode. Throws FitParseError if there are no usable records. */
export function decodeFit(bytes: Uint8Array): { samples: FitSample[]; laps: FitLap[] } {
  const stream = Stream.fromBuffer(bytes);
  if (!Decoder.isFIT(stream)) throw new FitParseError('Not a FIT file');

  let decoded: ReturnType<Decoder['read']>;
  try {
    decoded = new Decoder(Stream.fromBuffer(bytes)).read();
  } catch (err) {
    throw new FitParseError(`FIT decode failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const records = decoded.messages.recordMesgs ?? [];
  if (records.length === 0) {
    const decodeError = decoded.errors[0]?.message;
    if (decodeError) throw new FitParseError(`FIT file has no usable records (${decodeError})`);
    throw new FitNoRecordsError('FIT file has no usable records (no record messages)');
  }

  const samples: FitSample[] = [];
  for (const rec of records) {
    const parsed = recordSchema.safeParse(rec);
    if (!parsed.success) continue; // Records without a timestamp can't be placed in time.
    const r = parsed.data;
    const t = r.timestamp instanceof Date ? Math.round(r.timestamp.getTime() / 1000) : Math.round(r.timestamp);
    const lat = n(r.positionLat);
    const lng = n(r.positionLong);
    const hasPosition = lat !== null && lng !== null && !(lat === 0 && lng === 0);
    samples.push({
      t,
      power: n(r.power),
      hr: n(r.heartRate),
      cadence: n(r.cadence),
      speed: n(r.enhancedSpeed) ?? n(r.speed),
      altitude: n(r.enhancedAltitude) ?? n(r.altitude),
      distance: n(r.distance),
      lat: hasPosition ? lat! * SEMICIRCLE_TO_DEG : null,
      lng: hasPosition ? lng! * SEMICIRCLE_TO_DEG : null,
    });
  }
  if (samples.length === 0) throw new FitParseError('FIT file has no records with timestamps');

  const laps: FitLap[] = [];
  for (const lap of decoded.messages.lapMesgs ?? []) {
    const parsed = lapSchema.safeParse(lap);
    if (!parsed.success) continue;
    const st = parsed.data.startTime;
    laps.push({
      t: st instanceof Date ? Math.round(st.getTime() / 1000) : Math.round(st),
      elapsedS: parsed.data.totalElapsedTime,
      trigger: parsed.data.lapTrigger ?? null,
    });
  }
  return { samples, laps };
}
