import { z } from 'zod';
import { workoutTypeSchema } from './activity.js';

export const SETTINGS_SCHEMA_VERSION = 1 as const;

const isoDate = z.iso.date();

export const ftpEntrySchema = z.object({
  /** First date (inclusive, local) this FTP applies to. */
  from: isoDate,
  watts: z.number().int().positive(),
  source: z.enum(['manual', 'estimated']),
  note: z.string().optional(),
});

export const weightEntrySchema = z.object({
  from: isoDate,
  kg: z.number().positive(),
  note: z.string().optional(),
});

export const ftpHistorySchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  entries: z.array(ftpEntrySchema),
});

export const weightHistorySchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  entries: z.array(weightEntrySchema),
});

/** Lactate threshold heart rate, for heart-rate TSS. Never back-dated, like FTP. */
export const lthrEntrySchema = z.object({
  from: isoDate,
  bpm: z.number().int().min(80).max(230),
  source: z.enum(['manual', 'estimated']),
  note: z.string().optional(),
});

export const lthrHistorySchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  entries: z.array(lthrEntrySchema),
});

/** settings/app.json: app-wide preferences. */
export const appSettingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  /** Metres dropped from the start and end of every route on the heatmap. */
  privacyTrimM: z.number().int().min(0).max(5000),
  /** Rides whose suggested FTP (from their 20-minute best) was declined, so they aren't suggested again. */
  dismissedFtpRides: z.array(z.string()).default([]),
  /** The same for LTHR suggestions (from the best 20-minute power window's heart rate). */
  dismissedLthrRides: z.array(z.string()).default([]),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
/** What may be written: fields with a default can be left out. */
export type AppSettingsInput = z.input<typeof appSettingsSchema>;

/** One riding goal: a target per week, month or year. Targets are in km, hours, metres or rides. */
export const goalSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  metric: z.enum(['distance', 'time', 'elevation', 'rides']),
  period: z.enum(['week', 'month', 'year']),
  target: z.number().positive().max(1_000_000),
});

/** settings/goals.json: the user's riding goals, in display order. */
export const goalsFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  goals: z.array(goalSchema).max(12),
});

export type Goal = z.infer<typeof goalSchema>;

/** settings/climb-names.json: names the user gave climbs, by climb id. */
export const climbNamesSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  names: z.record(z.string(), z.string().min(1).max(80)),
});
export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  privacyTrimM: 0,
  dismissedFtpRides: [],
  dismissedLthrRides: [],
};

export type FtpEntry = z.infer<typeof ftpEntrySchema>;
export type WeightEntry = z.infer<typeof weightEntrySchema>;
export type LthrEntry = z.infer<typeof lthrEntrySchema>;

/** The entry in effect on `date`: the latest one whose `from` is on or before it. */
export function effectiveOn<T extends { from: string }>(entries: readonly T[], date: string): T | null {
  let best: T | null = null;
  for (const e of entries) {
    if (e.from <= date && (best === null || e.from > best.from)) best = e;
  }
  return best;
}

/**
 * The entry in effect on `date`, or the earliest entry (with `backApplied: true`) for dates
 * before the first one. For display-only uses: W/kg and training zones. Never use it for
 * TSS or training load, where FTP and LTHR are not back-dated (use effectiveOn).
 */
export function thresholdOn<T extends { from: string }>(
  entries: readonly T[],
  date: string,
): { entry: T; backApplied: boolean } | null {
  const inEffect = effectiveOn(entries, date);
  if (inEffect) return { entry: inEffect, backApplied: false };
  let earliest: T | null = null;
  for (const e of entries) if (earliest === null || e.from < earliest.from) earliest = e;
  return earliest ? { entry: earliest, backApplied: true } : null;
}

/** Weight for W/kg on `date`; before the first entry, the earliest one (weight changes slowly). */
export function weightOn(entries: readonly WeightEntry[], date: string): WeightEntry | null {
  return thresholdOn(entries, date)?.entry ?? null;
}

/** How hard a planned session is: a preset, or a custom TSS. */
export const planIntensitySchema = z.enum(['easy', 'medium', 'hard', 'custom']);

/** One planned training session on a day. Preset sessions take their TSS from the plan's presets. */
export const plannedSessionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    date: isoDate,
    title: z.string().trim().min(1).max(80),
    intensity: planIntensitySchema,
    /** Only for custom sessions. */
    tss: z.number().int().min(0).max(600).optional(),
  })
  .refine((session) => session.intensity !== 'custom' || session.tss !== undefined, {
    message: 'A custom session needs a TSS',
    path: ['tss'],
  });

export const planPresetsSchema = z.object({
  easy: z.number().int().min(0).max(600),
  medium: z.number().int().min(0).max(600),
  hard: z.number().int().min(0).max(600),
});

/** A target event, such as a race or a big ride, shown with a countdown and its projected form. */
export const plannedEventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  date: isoDate,
  name: z.string().trim().min(1).max(80),
});

export const DEFAULT_PLAN_PRESETS = { easy: 40, medium: 70, hard: 100 } as const;

/** settings/plan.json: planned sessions and target events (for the forecast and the Calendar) and the preset TSS values. */
export const planFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  presets: planPresetsSchema.default({ ...DEFAULT_PLAN_PRESETS }),
  sessions: z.array(plannedSessionSchema).max(1000).default([]),
  events: z.array(plannedEventSchema).max(100).default([]),
});

export type PlanIntensity = z.infer<typeof planIntensitySchema>;
export type PlannedSession = z.infer<typeof plannedSessionSchema>;
export type PlanPresets = z.infer<typeof planPresetsSchema>;
export type PlannedEvent = z.infer<typeof plannedEventSchema>;
export type PlanFile = z.infer<typeof planFileSchema>;

/** How an activity felt: an effort rating (1 easiest, 10 all-out) and a free-text note. */
export const activityNoteSchema = z.object({
  rpe: z.number().int().min(1).max(10).optional(),
  note: z.string().trim().min(1).max(500).optional(),
});

/** settings/activity-notes.json: notes by activity id. */
export const activityNotesFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  notes: z.record(z.string(), activityNoteSchema),
});

export type ActivityNote = z.infer<typeof activityNoteSchema>;

/**
 * settings/workout-types.json: workout types set by hand, by activity id. They replace the
 * detected type wherever it shows; rides without an entry keep the detected one.
 */
export const workoutTypeOverridesFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  overrides: z.record(z.string(), workoutTypeSchema),
});

const activityIdText = z.string().regex(/^[1-9][0-9]*$/);

/** The recordings of one ride, earliest first. The merged ride keeps the first one's id. */
export const rideMergeSchema = z.array(activityIdText).min(2);

/**
 * settings/ride-merges.json: rides recorded in several parts (recording stopped by accident),
 * joined into one ride at rebuild. Garmin keeps the parts; an id is in at most one merge.
 */
export const rideMergesFileSchema = z
  .object({
    schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
    merges: z.array(rideMergeSchema).default([]),
  })
  .refine(
    (file) => {
      const ids = file.merges.flat();
      return new Set(ids).size === ids.length;
    },
    { message: 'an activity can be in only one merge' },
  );

export type RideMerge = z.infer<typeof rideMergeSchema>;

const gearId = z.string().regex(/^[a-z0-9-]{1,40}$/);

/** A bike. Rides of the listed sport types are assigned to it unless a ride says otherwise. */
export const bikeSchema = z.object({
  id: gearId,
  name: z.string().trim().min(1).max(60),
  /** Garmin sport types (e.g. "gravel_cycling") this bike is used for. */
  types: z.array(z.string().regex(/^[a-z_]+$/)).max(20),
  /** Retired bikes keep their history but get no new rides. */
  retired: z.boolean().default(false),
});

/** A wearing part on a bike, replaced after a distance and/or riding time. */
export const gearComponentSchema = z.object({
  id: gearId,
  bikeId: gearId,
  name: z.string().trim().min(1).max(60),
  /** When the current one was fitted; usage counts from this date. */
  installedOn: isoDate,
  intervalKm: z.number().int().positive().max(100_000).optional(),
  intervalHours: z.number().int().positive().max(10_000).optional(),
});

/** A set of tyres that rides can be tagged with, e.g. the road and the gravel tyres swapped on one bike. */
export const tyreSchema = z.object({
  id: gearId,
  name: z.string().trim().min(1).max(40),
});

/** The tyres offered until the user edits the list. */
export const DEFAULT_TYRES = [
  { id: 'road', name: 'Road' },
  { id: 'gravel', name: 'Gravel' },
] as const;

/**
 * settings/gear.json: bikes, their components, rides assigned to a bike other than by type, and
 * the tyres rides were tagged with.
 */
export const gearFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  bikes: z.array(bikeSchema).max(20).default([]),
  components: z.array(gearComponentSchema).max(200).default([]),
  /** Activity id → bike id, or "none" for no bike. */
  overrides: z.record(z.string(), z.string()).default({}),
  tyres: z
    .array(tyreSchema)
    .max(20)
    .default(DEFAULT_TYRES.map((tyre) => ({ ...tyre }))),
  /** Activity id → the id of the tyres the ride was on. Rides without an entry are untagged. */
  rideTyres: z.record(z.string(), gearId).default({}),
});

export type Bike = z.infer<typeof bikeSchema>;
export type GearComponent = z.infer<typeof gearComponentSchema>;
export type Tyre = z.infer<typeof tyreSchema>;
export type GearFile = z.infer<typeof gearFileSchema>;
