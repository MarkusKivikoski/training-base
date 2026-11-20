import { parseArgs } from 'node:util';
import { createIndexStore, SYNC_PROGRESS_PREFIX, type SyncProgress } from '@app/shared';
import { describeRebuild, rebuild } from '../rebuild/rebuild.js';
import { createSyncDeps, loadConfig } from '../setup.js';
import { backfill } from '../sync/backfill.js';
import { addDays, assertIsoDate, localToday } from '../sync/dates.js';
import { incremental } from '../sync/incremental.js';
import { classifySyncError } from '../sync/classifyError.js';
import { acquireSyncLock } from '../sync/lock.js';
import { retryFailed } from '../sync/syncRange.js';

const USAGE = `Usage: npm run sync [-- --backfill] [--since YYYY-MM-DD] [--refetch] [--progress-json]

  (no flags)       Sync new activities since the last sync. The first run does a full backfill.
  --backfill       Continue the backfill down to --since (default: 5 years ago).
  --since          Oldest date the backfill should reach.
  --refetch        Re-download FIT files that already exist.
  --progress-json  Also print machine-readable progress lines (used by the app's sync button).
  --rebuild-only   Don't contact Garmin: only recompute derived data (after a settings change).`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      backfill: { type: 'boolean', default: false },
      since: { type: 'string' },
      refetch: { type: 'boolean', default: false },
      'progress-json': { type: 'boolean', default: false },
      'rebuild-only': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const emit = (p: SyncProgress) => {
    if (values['progress-json']) console.log(`${SYNC_PROGRESS_PREFIX}${JSON.stringify(p)}`);
  };

  try {
    const since = values.since ? assertIsoDate(values.since) : addDays(localToday(), -5 * 365);
    const config = loadConfig();
    const release = await acquireSyncLock(config.dataDir);
    try {
      if (values['rebuild-only']) {
        // Settings changed in the app: recompute what they affect, no Garmin calls.
        emit({ stage: 'rebuilding' });
        const rebuilt = await rebuild(config.dataDir, (m) => console.log(m), { mode: 'incremental' });
        console.log(describeRebuild(rebuilt));
        emit({ stage: 'done', newActivities: 0, downloaded: 0, activities: rebuilt.activities });
        return;
      }
      let downloaded = 0;
      const deps = {
        ...createSyncDeps(config, { refetch: values.refetch }),
        onDownloaded: () => emit({ stage: 'downloading', downloaded: ++downloaded }),
      };
      console.log(`Data directory: ${config.dataDir}`);
      const before = (await createIndexStore(config.dataDir).read()).activities.length;
      emit({ stage: 'checking' });

      const state = await deps.state.read();
      if (state.newestDone !== null) {
        const c = await incremental(deps);
        console.log(`Incremental: ${c.listed} activities, ${c.downloaded} FIT downloaded, ${c.failed} failed`);
      }
      if (values.backfill || state.newestDone === null) {
        const c = await backfill(deps, { since });
        console.log(`Backfill: ${c.listed} activities, ${c.downloaded} FIT downloaded, ${c.failed} failed`);
      }

      const r = await retryFailed(deps);
      if (r.listed > 0) {
        console.log(`Retried ${r.listed} earlier failures: ${r.downloaded} downloaded, ${r.failed} still failing`);
      }

      // Regenerate derived data so a running API picks up the new activities. Incremental:
      // only new or changed rides are parsed; `npm run rebuild` still rebuilds everything.
      emit({ stage: 'rebuilding' });
      const rebuilt = await rebuild(config.dataDir, (m) => console.log(m), { mode: 'incremental' });
      console.log(describeRebuild(rebuilt));
      emit({
        stage: 'done',
        newActivities: Math.max(0, rebuilt.activities - before),
        downloaded: downloaded + r.downloaded,
        activities: rebuilt.activities,
      });
    } finally {
      await release();
    }
  } catch (err) {
    // Print the message only. All error types are built to be secret-free.
    const message = err instanceof Error ? err.message : String(err);
    const code = classifySyncError(err);
    emit({ stage: 'error', code, message });
    console.error(`Sync failed: ${message}`);
    process.exitCode = code === 'key' || code === 'config' ? 2 : 1;
  }
}

void main();
