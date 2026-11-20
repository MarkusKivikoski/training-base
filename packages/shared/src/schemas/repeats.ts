import { z } from 'zod';
import { SETTINGS_SCHEMA_VERSION } from './settings.js';

/**
 * v2: outdoor routes ridden more than once (`routes`).
 * v3: power against the earlier powered efforts on a route (`powerChange`).
 */
export const REPEATS_SCHEMA_VERSION = 3 as const;

const nullableNumber = z.number().nullable();

/** `workout-<activityId>`: the ride the workout was first ridden in. Stable across rebuilds. */
export const workoutGroupIdSchema = z.string().regex(/^workout-[1-9][0-9]*$/);

/** A work block of a workout, in seconds on the reference ride's clock (end exclusive). */
export const workBlockSchema = z.object({
  startS: z.number().int().nonnegative(),
  endS: z.number().int().nonnegative(),
});

/** One ride's numbers over one work block. */
export const workBlockStatsSchema = z.object({
  avgPower: nullableNumber,
  avgHr: nullableNumber,
  /** Average heart rate over the block's last 30 seconds. */
  endHr: nullableNumber,
});

/** How an effort compares with the median of up to five efforts before it (effortChange in @app/metrics). */
export const effortChangeSchema = z.object({
  againstCount: z.number().int().positive(),
  powerPct: z.number(),
  hrBpm: z.number(),
  /** Power per heartbeat, %. Positive: more power for each beat. */
  efficiencyPct: z.number(),
});

/** One ride of a repeated workout. */
export const workoutEffortSchema = z.object({
  activityId: z.string(),
  date: z.iso.date(),
  /** Seconds this ride's workout starts after the reference's (negative: before). */
  offsetS: z.number().int(),
  /** How far the power profile is from the reference's, as a share of its mean power; 0 for the reference. */
  difference: z.number().nonnegative(),
  /** Put in this workout by hand (settings/ride-groups.json) rather than matched. */
  isManual: z.boolean(),
  durationS: z.number().nonnegative(),
  avgPower: nullableNumber,
  np: nullableNumber,
  avgHr: nullableNumber,
  decouplingPercent: nullableNumber,
  /** One entry per work block of the workout; null where this ride doesn't cover the block. */
  blocks: z.array(workBlockStatsSchema.nullable()),
  /** Average over the work blocks ridden, weighted by block length; null when the workout has none. */
  work: z.object({ avgPower: nullableNumber, avgHr: nullableNumber }).nullable(),
  /**
   * Against the earlier efforts: over the work blocks when the workout has them, else NP and
   * average heart rate. Null for the first effort, or without heart rate.
   */
  change: effortChangeSchema.nullable(),
});

/**
 * An indoor workout and every ride of it. Powered indoor rides only: the workout is recognised
 * from the power trace. A ride ridden once is a workout with one effort.
 */
export const workoutGroupSchema = z.object({
  id: workoutGroupIdSchema,
  /** The first ride of the workout; it defines the work blocks and the clock they are on. */
  referenceId: z.string(),
  /** The reference ride's duration, seconds. */
  durationS: z.number().nonnegative(),
  /**
   * Work blocks of the reference ride (detectIntervals in @app/metrics). Empty for steady rides
   * and when the blocks add up to under five minutes: those workouts are compared as a whole.
   */
  blocks: z.array(workBlockSchema),
  /** Oldest first. */
  efforts: z.array(workoutEffortSchema).min(1),
});

/** `route-<activityId>`: the ride the route was first ridden on. Stable across rebuilds. */
export const routeGroupIdSchema = z.string().regex(/^route-[1-9][0-9]*$/);

/** The id of anything in the repeats file that can be named: a workout or a route. */
export const repeatGroupIdSchema = z.union([workoutGroupIdSchema, routeGroupIdSchema]);

/** How an effort on a route compares with the median of up to five efforts before it (speedChange in @app/metrics). */
export const speedChangeSchema = z.object({
  againstCount: z.number().int().positive(),
  speedPct: z.number(),
  /** Null when this effort or every earlier one has no heart rate. */
  hrBpm: nullableNumber,
});

/** One ride of a repeated route. */
export const routeEffortSchema = z.object({
  activityId: z.string(),
  date: z.iso.date(),
  distanceM: z.number().positive(),
  /** Moving time: stops (traffic lights, breaks) don't count. */
  movingS: z.number().positive(),
  /** Distance ÷ moving time, m/s. */
  speedMps: z.number().positive(),
  avgHr: nullableNumber,
  avgPower: nullableNumber,
  np: nullableNumber,
  /** 1 = fastest of all efforts on this route. */
  rank: z.number().int().positive(),
  /** Null for the first effort. */
  change: speedChangeSchema.nullable(),
  /**
   * NP and average heart rate against the earlier efforts that have both (effortChange in
   * @app/metrics). Null without power or heart rate, and for the first effort with them.
   */
  powerChange: effortChangeSchema.nullable(),
});

/**
 * An outdoor route ridden more than once: the same roads from start to finish, the same way
 * round. Routes ridden once are not stored.
 */
export const routeGroupSchema = z.object({
  id: routeGroupIdSchema,
  /** The first ride of the route; the route's id comes from it. */
  referenceId: z.string(),
  /** The reference ride's distance, metres. */
  distanceM: z.number().positive(),
  /** Oldest first. */
  efforts: z.array(routeEffortSchema).min(2),
});

/** `derived/repeats.json`: rides that repeat an earlier one. */
export const repeatsFileSchema = z.object({
  schemaVersion: z.literal(REPEATS_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  workouts: z.array(workoutGroupSchema),
  routes: z.array(routeGroupSchema),
});

export type WorkBlock = z.infer<typeof workBlockSchema>;
export type WorkoutEffort = z.infer<typeof workoutEffortSchema>;
export type WorkoutGroup = z.infer<typeof workoutGroupSchema>;
export type RouteEffort = z.infer<typeof routeEffortSchema>;
export type RouteGroup = z.infer<typeof routeGroupSchema>;
export type RepeatsFile = z.infer<typeof repeatsFileSchema>;

/** A ride's place set by hand: a workout's id, or "own" to keep it out of every other ride's workout. */
export const workoutOverrideSchema = z.union([workoutGroupIdSchema, z.literal('own')]);

/** settings/ride-groups.json: names given to workouts and routes, and rides placed in a workout by hand. */
export const rideGroupsFileSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  /** Workout or route id → name. */
  names: z.record(z.string(), z.string().min(1).max(80)).default({}),
  /** Activity id → the workout it belongs to, or "own". */
  workoutOverrides: z.record(z.string(), workoutOverrideSchema).default({}),
});

export type WorkoutOverride = z.infer<typeof workoutOverrideSchema>;
export type RideGroupsFile = z.infer<typeof rideGroupsFileSchema>;
