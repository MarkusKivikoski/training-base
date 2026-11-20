import { z } from 'zod';

/** Why a sync failed, so the UI can say what to do. Messages never contain secrets. */
export const syncErrorCodeSchema = z.enum(['key', 'config', 'rate', 'offline', 'locked', 'other']);

/**
 * One progress line printed by `npm run sync -- --progress-json` (a JSON object per line).
 * The API's sync job reads these to report progress to the sync button.
 */
export const syncProgressSchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('checking') }),
  z.object({ stage: z.literal('downloading'), downloaded: z.number().int().nonnegative() }),
  z.object({ stage: z.literal('rebuilding') }),
  z.object({
    stage: z.literal('done'),
    /** Activities added to the index by this sync. */
    newActivities: z.number().int().nonnegative(),
    downloaded: z.number().int().nonnegative(),
    activities: z.number().int().nonnegative(),
  }),
  z.object({ stage: z.literal('error'), code: syncErrorCodeSchema, message: z.string() }),
]);

export type SyncProgress = z.infer<typeof syncProgressSchema>;
export type SyncErrorCode = z.infer<typeof syncErrorCodeSchema>;

/** Prefix that marks a progress line, so it can't be confused with ordinary log output. */
export const SYNC_PROGRESS_PREFIX = '@@sync ';
