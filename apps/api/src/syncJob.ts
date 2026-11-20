import { spawn } from 'node:child_process';
import { SYNC_PROGRESS_PREFIX, syncProgressSchema, type SyncErrorCode, type SyncProgress } from '@app/shared';

export type SyncJobState = 'idle' | 'running' | 'succeeded' | 'failed';

export type SyncJobKind = 'sync' | 'rebuild';

export interface SyncJobStatus {
  state: SyncJobState;
  /** A Garmin sync (Sync now), or only recomputing derived data after a settings change. */
  kind: SyncJobKind;
  /** A settings change is waiting for the current run to finish, then rebuilds. */
  rebuildQueued: boolean;
  /** Last progress stage while running ("checking", "downloading", "rebuilding"). */
  stage: 'checking' | 'downloading' | 'rebuilding' | null;
  /** FIT files downloaded so far in this run. */
  downloaded: number;
  /** Set when the run succeeded: activities added to the index. */
  newActivities: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: { code: SyncErrorCode; message: string } | null;
}

/** The child process the job runs; injectable so tests don't touch Garmin. */
export interface SyncProcess {
  onLine(cb: (line: string) => void): void;
  onExit(cb: (code: number | null) => void): void;
}
export type Spawner = (kind: SyncJobKind) => SyncProcess;

/** User-facing text per error code. The CLI's own message is kept for "other". */
const MESSAGES: Record<Exclude<SyncErrorCode, 'other'>, string> = {
  key: 'Garmin rejected the API key, or it has expired. Create a new Personal API key and update GARMIN_PERSONAL_API_KEY in .env.',
  config: 'GARMIN_PERSONAL_API_KEY is not set. Add it to .env (see .env.example).',
  rate: 'Garmin is limiting requests right now. Try again in a few minutes.',
  offline: "Couldn't reach Garmin. Check the internet connection and try again.",
  locked: 'A sync is already running (maybe from the terminal). Try again when it has finished.',
};

/**
 * Runs `npm run sync -- --progress-json` in the repo (with `--rebuild-only` to only recompute
 * derived data): Garmin calls and training math stay out of the API process.
 */
export function npmSyncSpawner(repoRoot: string): Spawner {
  return (kind) => {
    const child = spawn(
      'npm',
      ['run', 'sync', '--silent', '--', '--progress-json', ...(kind === 'rebuild' ? ['--rebuild-only'] : [])],
      {
        cwd: repoRoot,
        shell: true, // npm is a .cmd script on Windows
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    const lineCbs: Array<(l: string) => void> = [];
    let buffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const l of lines) for (const cb of lineCbs) cb(l);
    });
    child.stderr.resume(); // Drained; the error comes through the progress protocol.
    return {
      onLine: (cb) => lineCbs.push(cb),
      onExit: (cb) => {
        child.on('close', (code) => {
          if (buffer) for (const c of lineCbs) c(buffer);
          cb(code);
        });
        child.on('error', () => cb(null));
      },
    };
  };
}

/**
 * The background sync behind the "Sync now" button. One run at a time: start() while running
 * returns the current status. A page request never waits for Garmin; it only starts the job or
 * reads its status.
 */
export function createSyncJob({ spawner, now = () => new Date() }: { spawner: Spawner; now?: () => Date }) {
  let status: SyncJobStatus = {
    state: 'idle',
    kind: 'sync',
    rebuildQueued: false,
    stage: null,
    downloaded: 0,
    newActivities: null,
    startedAt: null,
    finishedAt: null,
    error: null,
  };

  function apply(p: SyncProgress) {
    if (p.stage === 'checking' || p.stage === 'rebuilding') status = { ...status, stage: p.stage };
    else if (p.stage === 'downloading') status = { ...status, stage: 'downloading', downloaded: p.downloaded };
    else if (p.stage === 'done') status = { ...status, newActivities: p.newActivities, downloaded: p.downloaded };
    else status = { ...status, error: { code: p.code, message: p.code === 'other' ? p.message : MESSAGES[p.code] } };
  }

  /** A settings change arrived while a run was in progress; rebuild when it ends. */
  let queued = false;

  function run(kind: SyncJobKind): SyncJobStatus {
    status = {
      state: 'running',
      kind,
      rebuildQueued: false,
      stage: kind === 'rebuild' ? 'rebuilding' : 'checking',
      downloaded: 0,
      newActivities: null,
      startedAt: now().toISOString(),
      finishedAt: null,
      error: null,
    };
    const proc = spawner(kind);
    proc.onLine((line) => {
      if (!line.startsWith(SYNC_PROGRESS_PREFIX)) return;
      try {
        const parsed = syncProgressSchema.safeParse(JSON.parse(line.slice(SYNC_PROGRESS_PREFIX.length)));
        if (parsed.success) apply(parsed.data);
      } catch {
        // Not a progress line after all; ignore.
      }
    });
    proc.onExit((code) => {
      const ok = code === 0 && status.error === null && status.newActivities !== null;
      const unexpected =
        kind === 'rebuild'
          ? 'Recomputing stopped unexpectedly. Run npm run rebuild in a terminal to see why.'
          : 'The sync stopped unexpectedly. Run npm run sync in a terminal to see why.';
      status = {
        ...status,
        state: ok ? 'succeeded' : 'failed',
        stage: null,
        finishedAt: now().toISOString(),
        error: ok ? null : (status.error ?? { code: 'other', message: unexpected }),
      };
      // The settings changed during that run, which may have read the old ones: recompute now.
      if (queued) {
        queued = false;
        run('rebuild');
      }
    });
    return status;
  }

  return {
    status: (): SyncJobStatus => ({ ...status, rebuildQueued: queued }),
    /** Starts a Garmin sync, or returns the running job. */
    start(): SyncJobStatus {
      if (status.state === 'running') return status;
      return run('sync');
    },
    /**
     * Recomputes derived data after a settings change. While a run is in progress the rebuild
     * waits for it (that run may have read the old settings) and then starts.
     */
    requestRebuild(): SyncJobStatus {
      if (status.state === 'running') {
        queued = true;
        return { ...status, rebuildQueued: true };
      }
      return run('rebuild');
    },
  };
}

export type SyncJob = ReturnType<typeof createSyncJob>;
