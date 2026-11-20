import { stat } from 'node:fs/promises';
import { createIndexStore, type ActivityIndex } from '@app/shared';

/**
 * Holds index.json in memory. Loads it at startup, and reloads it after ingestion:
 * at most once per `checkIntervalMs`, a request checks the file's mtime and re-reads
 * it when it changed. (Polling mtime is more reliable than fs.watch on Windows.)
 */
export function createIndexCache(dataDir: string, { checkIntervalMs = 2000, now = Date.now } = {}) {
  const store = createIndexStore(dataDir);
  let index: ActivityIndex | undefined;
  let loadedMtimeMs = -1;
  let lastCheck = -Infinity;
  let pending: Promise<ActivityIndex> | undefined;

  async function mtimeMs(): Promise<number> {
    try {
      return (await stat(store.file)).mtimeMs;
    } catch {
      return 0; // Missing file: serve the empty index.
    }
  }

  async function refresh(): Promise<ActivityIndex> {
    const m = await mtimeMs();
    if (!index || m !== loadedMtimeMs) {
      index = await store.read();
      loadedMtimeMs = m;
    }
    return index;
  }

  return {
    async get(): Promise<ActivityIndex> {
      // A check is under way: wait for it, or a request batched with the one that started it
      // would get the old index (the check time is already recent).
      if (pending) return pending;
      if (index && now() - lastCheck < checkIntervalMs) return index;
      lastCheck = now();
      pending ??= refresh().finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
}

export type IndexCache = ReturnType<typeof createIndexCache>;
