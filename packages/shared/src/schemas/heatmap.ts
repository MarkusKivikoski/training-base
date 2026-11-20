import { z } from 'zod';
import { disciplineSchema } from './activity.js';

/** v2: outdoor runs are included; every route carries its `discipline`. */
export const HEATMAP_SCHEMA_VERSION = 2 as const;

export const heatmapRouteSchema = z.object({
  id: z.string(),
  /** Local start date, YYYY-MM-DD. */
  date: z.iso.date(),
  /** Garmin typeKey, e.g. "cycling", "gravel_cycling" or "running". */
  sport: z.string(),
  discipline: disciplineSchema,
  /** Simplified, privacy-trimmed [lng, lat] polyline. */
  points: z.array(z.tuple([z.number(), z.number()])),
});

/** derived/heatmap.json: every outdoor ride's and run's route, trimmed by settings/app.json. */
export const heatmapFileSchema = z.object({
  schemaVersion: z.literal(HEATMAP_SCHEMA_VERSION),
  generatedAt: z.iso.datetime(),
  trimM: z.number().int().nonnegative(),
  routes: z.array(heatmapRouteSchema),
});

export type HeatmapRoute = z.infer<typeof heatmapRouteSchema>;
export type HeatmapFile = z.infer<typeof heatmapFileSchema>;
