import type { ActivityId, FitStore, RawStore, SyncState, SyncStateStore } from '@app/shared';
import type { GarminClient } from '../garmin/client.js';
import { GarminHttpError, GarminKeyRejectedError } from '../garmin/errors.js';
import { extractFit } from '../garmin/extractFit.js';
import type { IsoDate } from './dates.js';

export interface SyncDeps {
  client: GarminClient;
  raw: RawStore;
  fit: FitStore;
  state: SyncStateStore;
  log: (message: string) => void;
  /** Local date "today", YYYY-MM-DD. */
  today: () => IsoDate;
  /** Current time as an ISO timestamp, for lastSyncAt. */
  nowIso: () => string;
  /** Re-download FIT files that already exist. */
  refetch?: boolean;
  pageSize?: number;
  /** Called after each FIT file is downloaded (progress for the sync button). */
  onDownloaded?: () => void;
}

export interface SyncCounts {
  listed: number;
  downloaded: number;
  failed: number;
}

export const emptyCounts = (): SyncCounts => ({ listed: 0, downloaded: 0, failed: 0 });

const MAX_PAGES_PER_RANGE = 1000;

/**
 * Errors that mean the whole sync should stop rather than move on to the next
 * activity: auth is broken, or Garmin is still rate-limiting after all retries.
 */
export function isFatal(err: unknown): boolean {
  return (
    err instanceof GarminKeyRejectedError ||
    (err instanceof GarminHttpError && (err.status === 401 || err.status === 403 || err.status === 429))
  );
}

/** Downloads one activity's FIT file unless it is already stored. */
async function syncFit(deps: SyncDeps, id: ActivityId): Promise<boolean> {
  if (!deps.refetch && (await deps.fit.has(id))) return false;
  const { bytes } = await deps.client.downloadActivity(id);
  await deps.fit.write(id, await extractFit(bytes));
  return true;
}

function recordFailure(state: SyncState, id: ActivityId, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const attempts = (state.failed[id]?.attempts ?? 0) + 1;
  state.failed[id] = { attempts, lastError: message };
}

/**
 * Syncs every activity between startDate and endDate (inclusive): writes raw/<id>.json,
 * then fit/<id>.fit. Per-activity failures go to state.failed. Mutates `state` but
 * doesn't persist it; the caller saves it after each range.
 */
export async function syncRange(
  deps: SyncDeps,
  state: SyncState,
  startDate: IsoDate,
  endDate: IsoDate,
): Promise<SyncCounts> {
  const limit = deps.pageSize ?? 100;
  const counts = emptyCounts();

  for (let page = 0, start = 0; ; page++, start += limit) {
    if (page >= MAX_PAGES_PER_RANGE) throw new Error(`Too many pages for ${startDate}..${endDate}`);
    const items = await deps.client.searchActivities({ start, limit, startDate, endDate });
    counts.listed += items.length;

    for (const { id, raw } of items) {
      try {
        await deps.raw.write(id, raw);
        if (await syncFit(deps, id)) {
          counts.downloaded++;
          deps.onDownloaded?.();
        }
        delete state.failed[id];
      } catch (err) {
        if (isFatal(err)) throw err;
        recordFailure(state, id, err);
        counts.failed++;
        deps.log(`  activity ${id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (items.length < limit) break;
  }
  return counts;
}

/** Retries FIT downloads for activities in state.failed. Their raw summaries were stored earlier. */
export async function retryFailed(deps: SyncDeps): Promise<SyncCounts> {
  const state = await deps.state.read();
  const counts = emptyCounts();
  for (const id of Object.keys(state.failed) as ActivityId[]) {
    counts.listed++;
    try {
      if (!(await deps.raw.has(id))) continue; // Its summary will be stored when its date range is synced again.
      if (await syncFit(deps, id)) counts.downloaded++;
      delete state.failed[id];
    } catch (err) {
      if (isFatal(err)) {
        await deps.state.write(state);
        throw err;
      }
      recordFailure(state, id, err);
      counts.failed++;
    }
  }
  await deps.state.write(state);
  return counts;
}
