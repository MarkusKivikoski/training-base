import { DISCIPLINES, MEAN_MAX_DURATIONS_S, WORKOUT_TYPES } from '@app/metrics';
import { z } from 'zod';

export { MEAN_MAX_DURATIONS_S };

/** "cycling" or "running": the sports with their own records, heatmap routes and year in review. */
export const disciplineSchema = z.enum(DISCIPLINES);

/**
 * v2: metrics computed from FIT files; IF/TSS nullable (no FTP before the first entry).
 * v3: heart-rate TSS (`hrLoad`) and the TSS that feeds training load (`load`).
 * v4: time in power/HR zones (`zones`); `calories` replaced by `activeCalories`.
 * v5: per-ride record inputs (`records`): fastest distances and sustained max speed.
 * v6: climbs detected in outdoor rides (`climbs`).
 * v7: best 30-second heart rate (`hrPeak30s`), any activity type.
 * v8: LTHR estimate from the best 20-minute power window (`lthrEstimate`), rides with power and HR;
 *     aerobic decoupling (`decoupling`), rides of an hour or more with HR and power or speed.
 * v9: runs are marked (`isRunning`) and get record inputs (`records`) over the run distances.
 * v10: best heart rate over 5 s (`hrPeak5s`) replaces the 30 s value: a chest strap doesn't need
 *      the long average, and 30 s reads several beats under a true max.
 * v11: the kind of session a ride was (`workoutType`), read from power or heart rate.
 * v12: rides joined from several recordings (`mergedFrom`, settings/ride-merges.json).
 */
export const ACTIVITY_SCHEMA_VERSION = 12 as const;
export const INDEX_SCHEMA_VERSION = 12 as const;

export const lngLatSchema = z.tuple([z.number(), z.number()]);

/** A climb found in one ride (see detectClimbs in @app/metrics). Grades are fractions. */
export const detectedClimbSchema = z.object({
  startS: z.number().nonnegative(),
  endS: z.number().nonnegative(),
  startDistM: z.number().nonnegative(),
  lengthM: z.number().positive(),
  gainM: z.number(),
  avgGrade: z.number(),
  maxGrade: z.number(),
  score: z.number(),
  start: lngLatSchema,
  end: lngLatSchema,
});

/**
 * Per-activity inputs for the Records view, for rides and runs with streams. `distanceBestsS` has
 * one entry per record distance of the activity's discipline (RECORD_INPUTS in @app/metrics):
 * fastest elapsed seconds, null if the activity is shorter. `maxSpeedMps` is the best 3-second
 * average speed.
 */
export const rideRecordsSchema = z.object({
  distanceBestsS: z.array(z.number().nonnegative().nullable()),
  maxSpeedMps: z.number().nonnegative().nullable(),
  /** Distance from the stream with GPS glitches removed, metres (null without a distance channel). */
  distanceM: z.number().nonnegative().nullable(),
  /** Moving time from the stream (moving above ~3.6 km/h, pauses excluded), seconds. */
  movingS: z.number().nonnegative().nullable(),
});

/**
 * Seconds per zone for one channel. `threshold` is the FTP (W) or LTHR (bpm) used; zones are
 * display-only, so before the first entry the earliest one is applied (`backApplied`).
 */
export const zoneSetSchema = z.object({
  threshold: z.number().positive(),
  thresholdFrom: z.iso.date(),
  backApplied: z.boolean(),
  seconds: z.array(z.number().int().nonnegative()),
});

/** Time in Coggan power zones (7, % of FTP) and heart-rate zones (5, % of LTHR). Cycling only. */
export const activityZonesSchema = z.object({
  power: zoneSetSchema.nullable(),
  hr: zoneSetSchema.nullable(),
});

/** A kind of session: recovery, endurance, tempo, sweet spot, threshold, VO₂ max, anaerobic or mixed. */
export const workoutTypeSchema = z.enum(WORKOUT_TYPES);

/**
 * The kind of session a ride was, detected by classifyWorkout in @app/metrics. `reps` describes the
 * repeated work intervals the type came from, when it came from them.
 */
export const detectedWorkoutTypeSchema = z.object({
  type: workoutTypeSchema,
  basis: z.enum(['power', 'hr']),
  reps: z
    .object({
      count: z.number().int().positive(),
      durationS: z.number().nonnegative(),
      intensity: z.number().nonnegative(),
    })
    .nullable(),
});

/** Heart-rate TSS at the LTHR in effect on the ride's date. Never back-dated. */
export const hrLoadSchema = z.object({
  tss: z.number().nonnegative(),
  lthrUsed: z.number().int().positive(),
});

/**
 * The TSS that counts toward training load (CTL/ATL). Cycling only. Power TSS when there
 * is one; otherwise heart-rate TSS.
 */
export const activityLoadSchema = z.object({
  tss: z.number().nonnegative(),
  source: z.enum(['power', 'hr']),
});

const isoDate = z.iso.date();
const nullableNumber = z.number().nullable();

/** One recording of a ride joined from several. Seconds are since the joined ride's start. */
export const mergedPartSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/),
  startS: z.number().int().nonnegative(),
  durationS: z.number().nonnegative(),
});

/**
 * Our power metrics, computed from the FIT file. Null for rides without power.
 * IF/TSS (and ftpUsed) are null when no FTP is in effect on the ride's date. FTP is
 * never back-dated (user decision, 2026-11-05).
 */
export const powerMetricsSchema = z.object({
  np: z.number().nonnegative(),
  /** Seconds of riding used for TSS: segment lengths, zero-filled seconds included. */
  ridingTimeS: z.number().int().nonnegative(),
  ftpUsed: z.number().positive().nullable(),
  intensityFactor: z.number().nonnegative().nullable(),
  tss: z.number().nonnegative().nullable(),
});

export const activitySummarySchema = z.object({
  schemaVersion: z.literal(ACTIVITY_SCHEMA_VERSION),
  id: z.string().regex(/^[1-9][0-9]*$/),
  name: z.string(),
  /** Garmin activityType.typeKey, e.g. "cycling", "indoor_cycling", "strength_training". */
  sport: z.string(),
  isCycling: z.boolean(),
  /** A run of any kind (road, trail, treadmill). Runs get records and heatmap routes, but no training load. */
  isRunning: z.boolean(),
  /** No GPS, or an indoor sport type. Indoor activities are excluded from the heatmap. */
  isIndoor: z.boolean(),
  /** Local wall-clock start time, "YYYY-MM-DDTHH:mm:ss" (no zone). */
  startTimeLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  /** UTC start time, ISO 8601 with Z. */
  startTimeUtc: z.iso.datetime(),
  /** Local calendar date, used for weekly and daily aggregation. */
  date: isoDate,
  durationS: z.number().nonnegative(),
  movingDurationS: nullableNumber,
  distanceM: nullableNumber,
  elevationGainM: nullableNumber,
  avgSpeedMps: nullableNumber,
  maxSpeedMps: nullableNumber,
  avgHr: nullableNumber,
  maxHr: nullableNumber,
  avgCadence: nullableNumber,
  maxCadence: nullableNumber,
  avgPower: nullableNumber,
  maxPower: nullableNumber,
  /** Active calories: Garmin total minus resting (BMR) calories. Null when either is missing. */
  activeCalories: nullableNumber,
  /** True when the device recorded power, i.e. power metrics can be computed from the FIT file. */
  hasPower: z.boolean(),
  metrics: powerMetricsSchema.nullable(),
  /** Best average power per MEAN_MAX_DURATIONS_S entry (null where the ride is shorter). */
  meanMaxPower: z.array(z.number().nullable()).nullable(),
  /** Heart-rate TSS, on any activity with heart rate and an LTHR in effect (also powered rides, for calibration). */
  hrLoad: hrLoadSchema.nullable(),
  /** What feeds CTL/ATL. Null for non-cycling activities and rides with neither power TSS nor HR TSS. */
  load: activityLoadSchema.nullable(),
  zones: activityZonesSchema,
  records: rideRecordsSchema.nullable(),
  /** Climbs in outdoor rides with GPS, altitude and distance; null otherwise. */
  climbs: z.array(detectedClimbSchema).nullable(),
  /** Highest 5-second average heart rate from the stream (bpm), any activity with heart rate. */
  hrPeak5s: nullableNumber,
  /**
   * 95% of the average heart rate during the best 20-minute power window (bpm), as in an FTP test;
   * null without 20 minutes of power and heart rate.
   */
  lthrEstimate: z.object({ bpm: z.number(), avgHr: z.number() }).nullable(),
  /**
   * Aerobic decoupling (%): how much output per heartbeat fell from the first half to the second,
   * against power when the ride has it, else speed (outdoor rides). Null for short rides.
   */
  decoupling: z
    .object({ percent: z.number(), basis: z.enum(['power', 'speed']), durationS: z.number().int() })
    .nullable(),
  /**
   * The kind of session (rides only), from the power zones' FTP or, without power, the HR zones.
   * Null for other sports, short rides and rides with neither. A type set by hand is kept apart,
   * in settings/workout-types.json.
   */
  workoutType: detectedWorkoutTypeSchema.nullable(),
  /**
   * The recordings this ride was joined from (settings/ride-merges.json), earliest first. Nothing
   * was recorded between two parts. Null for a ride recorded in one go.
   */
  mergedFrom: z.array(mergedPartSchema).nullable(),
});

export type MergedPart = z.infer<typeof mergedPartSchema>;

/** v2: `allActivities`, load from every activity type (heart-rate TSS outside cycling). */
export const LOAD_SCHEMA_VERSION = 2 as const;

export const dayLoadSchema = z.object({
  date: isoDate,
  tss: z.number().nonnegative(),
  ctl: z.number().nonnegative(),
  atl: z.number().nonnegative(),
  tsb: z.number(),
});

/**
 * `derived/daily-load.json`: TSS/CTL/ATL/TSB per day. `days` is cycling, the training load used
 * everywhere; `allActivities` adds heart-rate TSS from other sports, an indicator kept separate.
 */
export const dailyLoadFileSchema = z.object({
  schemaVersion: z.literal(LOAD_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  days: z.array(dayLoadSchema),
  allActivities: z.array(dayLoadSchema),
});

export type DailyLoadFile = z.infer<typeof dailyLoadFileSchema>;

export type ActivitySummary = z.infer<typeof activitySummarySchema>;
export type WorkoutType = z.infer<typeof workoutTypeSchema>;

export const activityIndexSchema = z.object({
  schemaVersion: z.literal(INDEX_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  /** Newest first. */
  activities: z.array(activitySummarySchema),
});

export type ActivityIndex = z.infer<typeof activityIndexSchema>;
