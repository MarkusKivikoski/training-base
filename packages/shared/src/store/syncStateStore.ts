import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { atomicWrite } from './atomicWrite.js';

export const SYNC_STATE_SCHEMA_VERSION = 1 as const;

const isoDate = z.iso.date();

export const syncStateSchema = z.object({
  schemaVersion: z.literal(SYNC_STATE_SCHEMA_VERSION),
  /** Newest date (inclusive) whose activities are fully synced. The incremental sync starts here. */
  newestDone: isoDate.nullable(),
  /** Oldest date (inclusive) the backfill has completed down to. The backfill resumes below it. */
  oldestDone: isoDate.nullable(),
  /** Per-activity failures, retried on the next sync. Messages never contain secrets. */
  failed: z.record(z.string(), z.object({ attempts: z.number().int().positive(), lastError: z.string() })),
  lastSyncAt: z.iso.datetime().nullable(),
});

export type SyncState = z.infer<typeof syncStateSchema>;

export function initialSyncState(): SyncState {
  return {
    schemaVersion: SYNC_STATE_SCHEMA_VERSION,
    newestDone: null,
    oldestDone: null,
    failed: {},
    lastSyncAt: null,
  };
}

/** `data/sync-state.json`: backfill and sync progress cursor. */
export function createSyncStateStore(dataDir: string) {
  const file = path.join(dataDir, 'sync-state.json');
  return {
    file,
    async read(): Promise<SyncState> {
      let text: string;
      try {
        text = await readFile(file, 'utf8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return initialSyncState();
        throw err;
      }
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
      const parsed = syncStateSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          `${file} is invalid or from another schema version. Delete it to restart the sync (downloads are idempotent).`,
        );
      }
      return parsed.data;
    },
    write: (state: SyncState) => atomicWrite(file, `${JSON.stringify(state, null, 2)}\n`),
  };
}

export type SyncStateStore = ReturnType<typeof createSyncStateStore>;
