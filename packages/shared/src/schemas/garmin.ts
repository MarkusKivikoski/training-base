import { z } from 'zod';

/*
 * Garmin Personal API response schemas.
 *
 * Confirmed with `npm run probe` against the real API on 2026-11-04: the activity list
 * is a bare JSON array of objects, and `activityId` is a number. Items carry many more
 * fields (startTimeLocal, startTimeGMT, activityType.typeKey, distance, duration,
 * avgPower, ...). Some appear only on some activities, e.g. maxAvgPower_3600. A
 * redacted example lives in packages/ingest/test/fixtures/activity-list.json.
 *
 * Only the fields the sync relies on are required. Everything else passes through
 * untouched, so `data/raw/` keeps the full payload. Add fields here when a later slice
 * reads them, and re-run the probe if Garmin's responses seem to change.
 */

export const activityListItemSchema = z
  .object({
    activityId: z.number().int().positive(),
  })
  .loose();

export type ActivityListItem = z.infer<typeof activityListItemSchema>;

export const activityListSchema = z.array(activityListItemSchema);

const optNum = z.number().nullish();

/**
 * The fields of a stored raw summary (data/raw/<id>.json) that rebuild reads. Names
 * and presence were checked against 19 real activities on 2026-11-04. Many fields only
 * appear on some activities: power on rides with a power meter, GPS and elevation on
 * outdoor activities, cadence on rides.
 */
export const rawActivitySummarySchema = z
  .object({
    activityId: z.number().int().positive(),
    activityName: z.string().nullish(),
    /** "YYYY-MM-DD HH:mm:ss", local wall-clock time. */
    startTimeLocal: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    /** "YYYY-MM-DD HH:mm:ss", UTC. */
    startTimeGMT: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    activityType: z.object({ typeKey: z.string(), typeId: z.number(), parentTypeId: z.number().nullish() }).loose(),
    /** 2 for every bike activity seen (cycling, gravel_cycling, indoor_cycling); 1 for every run (2026-11-11). */
    sportTypeId: optNum,
    duration: z.number().nonnegative(),
    movingDuration: optNum,
    distance: optNum,
    elevationGain: optNum,
    averageSpeed: optNum,
    maxSpeed: optNum,
    averageHR: optNum,
    maxHR: optNum,
    averageBikingCadenceInRevPerMinute: optNum,
    maxBikingCadenceInRevPerMinute: optNum,
    avgPower: optNum,
    maxPower: optNum,
    calories: optNum,
    /** Resting calories burned during the activity; active = calories - bmrCalories. */
    bmrCalories: optNum,
    startLatitude: optNum,
  })
  .loose();

export type RawActivitySummary = z.infer<typeof rawActivitySummarySchema>;
