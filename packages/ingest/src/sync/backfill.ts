import { addDays, maxDate, type IsoDate } from './dates.js';
import { emptyCounts, syncRange, type SyncCounts, type SyncDeps } from './syncRange.js';

export const CHUNK_DAYS = 30;

/**
 * Walks backwards from today (or from where a previous backfill stopped) down to
 * `since`, in CHUNK_DAYS-day chunks. State is saved after every chunk, so an
 * interrupted backfill resumes at the next unfinished chunk.
 */
export async function backfill(deps: SyncDeps, { since }: { since: IsoDate }): Promise<SyncCounts> {
  const state = await deps.state.read();
  const total = emptyCounts();

  let end = state.oldestDone ? addDays(state.oldestDone, -1) : deps.today();
  if (end < since) {
    deps.log(`Backfill already covers ${since} (oldest synced date: ${state.oldestDone}).`);
    return total;
  }

  while (end >= since) {
    const start = maxDate(since, addDays(end, -(CHUNK_DAYS - 1)));
    deps.log(`Backfill ${start} .. ${end}`);
    const counts = await syncRange(deps, state, start, end);
    total.listed += counts.listed;
    total.downloaded += counts.downloaded;
    total.failed += counts.failed;

    state.oldestDone = start;
    state.newestDone = state.newestDone === null ? end : maxDate(state.newestDone, end);
    state.lastSyncAt = deps.nowIso();
    await deps.state.write(state);
    deps.log(`  ${counts.listed} activities, ${counts.downloaded} FIT downloaded, ${counts.failed} failed`);

    end = addDays(start, -1);
  }
  return total;
}
