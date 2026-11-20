import { z } from 'zod';
import { ftpEntrySchema } from './settings.js';

/**
 * v3: time in zones per week and month (`zones`). v4: gym workouts in the year-over-year totals.
 * v5: max heart rate per year (`maxHr`). v6: aerobic decoupling per ride (`decoupling`).
 * v7: max heart rate from rides only, over 5 s instead of 30 s.
 */
export const TRENDS_SCHEMA_VERSION = 7 as const;

export const monthVolumeSchema = z.object({
  /** YYYY-MM */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  /** Moving time, seconds. */
  indoorS: z.number().nonnegative(),
  outdoorS: z.number().nonnegative(),
  distanceM: z.number().nonnegative(),
  elevationGainM: z.number().nonnegative(),
  rides: z.number().int().nonnegative(),
  strengthSessions: z.number().int().nonnegative(),
});

const perMetric = <T extends z.ZodType>(value: T) =>
  z.object({ hours: value, distanceKm: value, elevationM: value, rides: value, gym: value });

export const yearCumulativeSchema = z.object({
  year: z.number().int(),
  /** Per metric, cumulative totals at the end of week 1..53; the current year stops at today. */
  weeks: perMetric(z.array(z.number().nonnegative())),
  /** Per metric, totals from 1 Jan to today's month-day in that year. */
  toDate: perMetric(z.number().nonnegative()),
});

export const zonePeriodSchema = z.object({
  /** ISO week Monday or YYYY-MM. */
  period: z.string(),
  power: z.array(z.number().nonnegative()),
  hr: z.array(z.number().nonnegative()),
});

/** Efficiency factor of one ride with power. */
export const markerRideSchema = z.object({
  id: z.string(),
  date: z.iso.date(),
  name: z.string(),
  np: z.number(),
  avgHr: z.number().nullable(),
  ef: z.number().nullable(),
});

/** Weekly VO2 max estimate from the best 5-min power in the previous 90 days. */
export const vo2maxPointSchema = z.object({
  date: z.iso.date(),
  vo2max: z.number(),
  best5minW: z.number(),
  /** Weight used for W/kg (the first entry is applied to earlier dates). */
  kg: z.number(),
  /** The ride the 5-min best came from. */
  activityId: z.string(),
});

/** derived/trends.json: long-term volume and fitness markers for the Trends screen. */
export const trendsFileSchema = z.object({
  schemaVersion: z.literal(TRENDS_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  /** Local date the file was computed for. */
  today: z.iso.date(),
  months: z.array(monthVolumeSchema),
  years: z.array(yearCumulativeSchema),
  ftp: z.object({
    manual: z.array(ftpEntrySchema),
    eftp: z.array(z.object({ date: z.iso.date(), watts: z.number() })),
  }),
  vo2max: z.array(vo2maxPointSchema),
  /** Seconds per power zone (7) and heart-rate zone (5), per ISO week and per month. */
  zones: z.object({ weeks: z.array(zonePeriodSchema), months: z.array(zonePeriodSchema) }),
  rides: z.array(markerRideSchema),
  /** Aerobic decoupling per ride of an hour or more, oldest first. */
  decoupling: z.array(
    z.object({
      id: z.string(),
      date: z.iso.date(),
      name: z.string(),
      percent: z.number(),
      basis: z.enum(['power', 'speed']),
    }),
  ),
  /** Highest 5-second heart rate per year (rides only), with the highest single reading. */
  maxHr: z.array(
    z.object({
      year: z.number().int(),
      bpm: z.number(),
      id: z.string(),
      date: z.iso.date(),
      name: z.string(),
      sport: z.string(),
      peakBpm: z.number().nullable(),
    }),
  ),
});

export type TrendsFile = z.infer<typeof trendsFileSchema>;
