import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** A lock older than this is assumed to belong to a crashed sync. */
export const STALE_LOCK_MS = 30 * 60 * 1000;

export class SyncLockedError extends Error {
  override readonly name = 'SyncLockedError';
  constructor() {
    super('A sync is already running.');
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 only checks that the process exists.
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Takes `data/sync.lock` so only one sync runs at a time (from the terminal or the sync
 * button). A lock from a dead process, or older than 30 minutes, is replaced. Returns the
 * release function; throws SyncLockedError when another sync holds the lock.
 */
export async function acquireSyncLock(
  dataDir: string,
  {
    now = Date.now,
    pid = process.pid,
    alive = isAlive,
  }: { now?: () => number; pid?: number; alive?: (pid: number) => boolean } = {},
): Promise<() => Promise<void>> {
  const file = path.join(dataDir, 'sync.lock');
  const body = JSON.stringify({ pid, startedAt: new Date(now()).toISOString() });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await writeFile(file, body, { flag: 'wx' }); // Fails if the file exists: an atomic "take".
      return () => rm(file, { force: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    let held: { pid?: number; startedAt?: string } = {};
    try {
      held = JSON.parse(await readFile(file, 'utf8')) as typeof held;
    } catch {
      // Unreadable lock: treat as stale.
    }
    const age = held.startedAt ? now() - Date.parse(held.startedAt) : Infinity;
    const stale = !(age < STALE_LOCK_MS) || typeof held.pid !== 'number' || !alive(held.pid);
    if (!stale) throw new SyncLockedError();
    await rm(file, { force: true });
  }
  throw new SyncLockedError();
}
