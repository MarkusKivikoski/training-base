import { addDays, minDate } from './dates.js';
import { CHUNK_DAYS } from './backfill.js';
import { emptyCounts, syncRange, type SyncCounts, type SyncDeps } from './syncRange.js';

/** Re-checks this many days before newestDone to catch activities uploaded late. */
export const OVERLAP_DAYS = 2;

/**
 * Syncs from just before the newest synced date up to today, oldest chunk first, and
 * saves state after every chunk. Requires a previous backfill.
 */
export async function incremental(deps: SyncDeps): Promise<SyncCounts> {
  const state = await deps.state.read();
  if (state.newestDone === null) throw new Error('No previous sync found; run a backfill first.');

  const today = deps.today();
  const total = emptyCounts();
  let start = addDays(state.newestDone, -OVERLAP_DAYS);

  while (start <= today) {
    const end = minDate(today, addDays(start, CHUNK_DAYS - 1));
    deps.log(`Sync ${start} .. ${end}`);
    const counts = await syncRange(deps, state, start, end);
    total.listed += counts.listed;
    total.downloaded += counts.downloaded;
    total.failed += counts.failed;

    state.newestDone = end;
    state.lastSyncAt = deps.nowIso();
    await deps.state.write(state);
    deps.log(`  ${counts.listed} activities, ${counts.downloaded} FIT downloaded, ${counts.failed} failed`);

    start = addDays(end, 1);
  }
  return total;
}
