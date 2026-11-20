import { z } from 'zod';
import { lngLatSchema } from './activity.js';

export const CLIMBS_SCHEMA_VERSION = 1 as const;

/** One ride up a climb. Elapsed time, like Strava segments. */
export const climbEffortSchema = z.object({
  activityId: z.string(),
  date: z.iso.date(),
  name: z.string(),
  /** Seconds since the start of that ride. */
  startS: z.number().nonnegative(),
  timeS: z.number().positive(),
  avgPower: z.number().nullable(),
  avgHr: z.number().nullable(),
  /** 1 = fastest of all efforts on this climb. */
  rank: z.number().int().positive(),
});

/**
 * A climb ridden at least once: defined by the first ride it was detected in (its start and end
 * points, length and grade), with every pass over it from any ride.
 */
export const climbSchema = z.object({
  /** `<activityId>-<n>`: the ride it was first detected in and its index there. Stable across rebuilds. */
  id: z.string(),
  lengthM: z.number().positive(),
  gainM: z.number(),
  avgGrade: z.number(),
  maxGrade: z.number(),
  score: z.number(),
  start: lngLatSchema,
  end: lngLatSchema,
  /** The climb's line, simplified, from the reference ride. */
  path: z.array(lngLatSchema),
  /** [distance from the climb's start (m), altitude (m)] from the reference ride. */
  profile: z.array(z.tuple([z.number(), z.number()])),
  /** Oldest first. */
  efforts: z.array(climbEffortSchema),
});

export const climbsFileSchema = z.object({
  schemaVersion: z.literal(CLIMBS_SCHEMA_VERSION),
  generatedAt: z.string(),
  climbs: z.array(climbSchema),
});

export type ClimbEffort = z.infer<typeof climbEffortSchema>;
export type Climb = z.infer<typeof climbSchema>;
export type ClimbsFile = z.infer<typeof climbsFileSchema>;
