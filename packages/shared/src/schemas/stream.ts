import { z } from 'zod';

/** v2: cumulative `distance` channel. v3: device laps (`laps`). */
export const STREAM_SCHEMA_VERSION = 3 as const;
export const ROUTE_SCHEMA_VERSION = 1 as const;

const channel = z.array(z.number().nullable()).nullable();

/**
 * Per-second streams in columnar form (CLAUDE.md). `time` is seconds since the first
 * record. Seconds with no record are absent (time jumps); nothing is gap-filled here.
 * A channel the device never recorded is null.
 */
export const streamSchema = z
  .object({
    schemaVersion: z.literal(STREAM_SCHEMA_VERSION),
    time: z.array(z.number().int().nonnegative()),
    power: channel,
    hr: channel,
    cadence: channel,
    /** m/s */
    speed: channel,
    /** metres */
    altitude: channel,
    /** Cumulative distance from the device, metres. */
    distance: channel,
    lat: channel,
    lng: channel,
    /** Laps the device recorded (seconds since the first record, end exclusive); null if none were stored. */
    laps: z
      .array(
        z.object({
          startS: z.number().int().nonnegative(),
          endS: z.number().int().nonnegative(),
          trigger: z.string().nullable(),
        }),
      )
      .nullable(),
  })
  .refine(
    (s) =>
      [s.power, s.hr, s.cadence, s.speed, s.altitude, s.distance, s.lat, s.lng].every(
        (c) => c === null || c.length === s.time.length,
      ),
    { message: 'every channel must be as long as time' },
  );

export type ActivityStream = z.infer<typeof streamSchema>;

/** Simplified [lng, lat] polyline for outdoor rides. */
export const routeSchema = z.object({
  schemaVersion: z.literal(ROUTE_SCHEMA_VERSION),
  points: z.array(z.tuple([z.number(), z.number()])),
});

export type ActivityRoute = z.infer<typeof routeSchema>;
