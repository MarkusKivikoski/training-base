import { useStartSync, useSyncStatus } from '@/shared/api/sync';
import { formatTimeAgo } from '@/shared/lib/formatters';

type SyncStatus = NonNullable<ReturnType<typeof useSyncStatus>['data']>;

const activities = (n: number) => `${n} new ${n === 1 ? 'activity' : 'activities'}`;

/** What the running job is doing right now. */
const progressText = (status: SyncStatus): string => {
  if (status.stage === 'downloading') return `Downloading ${activities(status.downloaded)}…`;
  if (status.stage === 'rebuilding' && status.kind === 'rebuild') return 'Recomputing stats after a settings change…';
  if (status.stage === 'rebuilding') return 'Updating stats…';
  return 'Checking Garmin…';
};

/** The outcome of the last successful run, or null. */
const resultText = (status: SyncStatus): string | null => {
  if (status.state !== 'succeeded') return null;
  if (status.kind === 'rebuild') return 'Stats recomputed';
  const newActivities = status.newActivities ?? 0;
  return newActivities === 0 ? 'Up to date' : activities(newActivities);
};

const buttonLabel = (isRunning: boolean, status: SyncStatus | undefined) => {
  if (!isRunning) return 'Sync now';
  return status?.kind === 'rebuild' ? 'Recomputing…' : 'Syncing…';
};

const SyncIcon = ({ isSpinning }: { isSpinning: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 16 16"
    className={`size-3.5 ${isSpinning ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SyncButtonProps = {
  /** The one-line version for the mobile header. */
  compact?: boolean;
};

/**
 * "Sync now" plus when the data was last synced. The sync runs in the background on the API
 * (the page never waits for Garmin); this polls its progress and refreshes all pages when done.
 */
export const SyncButton = ({ compact = false }: SyncButtonProps) => {
  const syncStatus = useSyncStatus();
  const startSync = useStartSync();
  const status = syncStatus.data;
  const isRunning = status?.state === 'running' || startSync.isPending;
  const error = status?.state === 'failed' ? status.error : null;

  const result = status ? resultText(status) : null;
  const lastSynced = `Last synced ${formatTimeAgo(status?.lastSyncAt)}${result ? ` · ${result}` : ''}`;
  const detail = isRunning && status ? progressText(status) : lastSynced;
  const sizeClass = compact ? 'px-2.5 py-1 text-xs' : 'w-full justify-center px-3 py-1.5 text-sm';

  const button = (
    <button
      type="button"
      onClick={() => startSync.mutate()}
      disabled={isRunning || !status}
      aria-busy={isRunning}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line font-medium text-ink hover:bg-surface-0 disabled:cursor-default disabled:opacity-70 ${sizeClass}`}
    >
      <SyncIcon isSpinning={isRunning} />
      {buttonLabel(isRunning, status)}
    </button>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2" title={error?.message ?? detail}>
        {error && <span className="text-xs text-status-critical">Sync failed</span>}
        {button}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {button}
      <p className="px-1 text-xs text-ink-3" aria-live="polite">
        {detail}
      </p>
      {error && (
        <p role="alert" className="px-1 text-xs text-status-critical">
          {error.message}
        </p>
      )}
      {syncStatus.error && <p className="px-1 text-xs text-ink-3">Sync status unavailable (is the API running?)</p>}
    </div>
  );
};
