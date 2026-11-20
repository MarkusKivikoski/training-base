import { z } from 'zod';

/**
 * v2: climb records (`climbs`). v3: rides per period, hilliest ride, earliest start, breaks, first rides.
 * v4: one set of records per discipline (`disciplines`), so runs have their own.
 */
export const RECORDS_SCHEMA_VERSION = 4 as const;

/**
 * One podium entry. Ride records carry the ride's `id` and `name`; period records (biggest
 * week/month/year) have no id, and `date` is the period key (Monday, YYYY-MM or YYYY).
 */
export const recordEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  date: z.string(),
  value: z.number(),
  /** Secondary value, e.g. average speed (m/s) for a distance effort. */
  extra: z.number().optional(),
});

const podium = z.array(recordEntrySchema);
const periodPodiums = z.object({ hours: podium, distanceKm: podium, elevationM: podium, rides: podium });
const streakSchema = z.object({ length: z.number().int().positive(), from: z.string(), to: z.string() }).nullable();

/**
 * One scope's records. The comments describe cycling; run records have the same shape with the
 * run distances and limits (RECORD_RULES in the ingest package), and leave `maxSpeed`, `power`
 * and `climbs` empty.
 */
export const recordsScopeSchema = z.object({
  /** Fastest elapsed seconds per record distance (outdoor); `extra` is average m/s. */
  efforts: z.array(z.object({ distanceM: z.number(), top: podium })),
  /** Best 3-second speed, m/s (outdoor). */
  maxSpeed: podium,
  /** Metres (outdoor). */
  longestDistance: podium,
  /** Moving seconds (all rides). */
  longestTime: podium,
  /** Watts per duration, from rides with power. */
  power: z.array(z.object({ durationS: z.number(), top: podium })),
  periods: z.object({ week: periodPodiums, month: periodPodiums, year: periodPodiums.nullable() }),
  highs: z.object({
    /** Metres climbed in one ride. */
    elevation: podium,
    /** m/s, distance ÷ moving time, outdoor rides of 20 km or more. */
    avgSpeed: podium,
    /** bpm, cycling. */
    maxHr: podium,
    /** Metres of climbing per km, outdoor rides of 10 km or more; `extra` is the elevation gain (m). */
    hilliest: podium,
    /** Start time of day in seconds after local midnight (starts from 04:00), lowest first. */
    earliestStart: podium,
  }),
  /**
   * Longest breaks between rides: `value` is the number of full days without a ride, the entry is
   * the ride that ended the break (the last ride before it was `value` + 1 days earlier).
   */
  breaks: podium,
  /** The first ride of each year, newest year first (all time), or of that year. `value` is its distance (m). */
  firstRides: podium,
  /**
   * Distinct climbs (derived/climbs.json) ridden in the scope; `id` is the climb id, `date` the
   * last time it was ridden in the scope. Longest: metres, `extra` gain (m). Biggest gain: metres
   * gained, `extra` length (m).
   */
  climbs: z.object({ longest: podium, biggestGain: podium }),
  streaks: z.object({
    days: streakSchema,
    weeks: streakSchema,
    /** Only in the all-time scope. */
    currentDays: streakSchema.optional(),
    currentWeeks: streakSchema.optional(),
  }),
});

/** One discipline's records: for all time ("all") and each year with an activity, newest year first. */
export const disciplineRecordsSchema = z.object({
  years: z.array(z.number().int()),
  scopes: z.record(z.string(), recordsScopeSchema),
});

/** derived/records.json: the records of each discipline. */
export const recordsFileSchema = z.object({
  schemaVersion: z.literal(RECORDS_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  today: z.iso.date(),
  disciplines: z.object({ cycling: disciplineRecordsSchema, running: disciplineRecordsSchema }),
});

export type RecordEntry = z.infer<typeof recordEntrySchema>;
export type RecordsScope = z.infer<typeof recordsScopeSchema>;
export type DisciplineRecords = z.infer<typeof disciplineRecordsSchema>;
export type RecordsFile = z.infer<typeof recordsFileSchema>;
