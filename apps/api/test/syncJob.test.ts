import { SYNC_PROGRESS_PREFIX, type SyncProgress } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { createSyncJob, type SyncProcess } from '../src/syncJob.js';

/** A controllable fake of the sync child process. */
function fakeProcess() {
  let line: (l: string) => void = () => {};
  let exit: (code: number | null) => void = () => {};
  const proc: SyncProcess = { onLine: (cb) => (line = cb), onExit: (cb) => (exit = cb) };
  return {
    proc,
    emit: (p: SyncProgress) => line(`${SYNC_PROGRESS_PREFIX}${JSON.stringify(p)}`),
    log: (l: string) => line(l),
    exit: (code: number | null) => exit(code),
  };
}

const clock = () => new Date('2026-11-07T12:00:00Z');

describe('sync job', () => {
  it('reports stages and the result, and runs one sync at a time', () => {
    const fake = fakeProcess();
    let spawned = 0;
    const job = createSyncJob({ spawner: () => (spawned++, fake.proc), now: clock });
    expect(job.status().state).toBe('idle');

    expect(job.start()).toMatchObject({ state: 'running', stage: 'checking' });
    expect(job.start().state).toBe('running');
    expect(spawned).toBe(1);

    fake.log('Sync 2026-11-03 .. 2026-11-07'); // ordinary output is ignored
    fake.emit({ stage: 'downloading', downloaded: 2 });
    expect(job.status()).toMatchObject({ stage: 'downloading', downloaded: 2 });
    fake.emit({ stage: 'rebuilding' });
    fake.emit({ stage: 'done', newActivities: 2, downloaded: 2, activities: 722 });
    fake.exit(0);
    expect(job.status()).toMatchObject({
      state: 'succeeded',
      newActivities: 2,
      stage: null,
      error: null,
      finishedAt: '2026-11-07T12:00:00.000Z',
    });

    job.start();
    expect(spawned).toBe(2);
  });

  it('turns error codes into clear messages', () => {
    const fake = fakeProcess();
    const job = createSyncJob({ spawner: () => fake.proc, now: clock });
    job.start();
    fake.emit({ stage: 'error', code: 'key', message: 'Garmin Personal API key was rejected' });
    fake.exit(2);
    expect(job.status().state).toBe('failed');
    expect(job.status().error).toMatchObject({ code: 'key' });
    expect(job.status().error?.message).toMatch(/API key/);
  });

  it('keeps the CLI message for other errors, and covers a crash without a message', () => {
    const a = fakeProcess();
    const job = createSyncJob({ spawner: () => a.proc, now: clock });
    job.start();
    a.emit({ stage: 'error', code: 'other', message: 'Garmin API GET /x failed with HTTP 500' });
    a.exit(1);
    expect(job.status().error).toEqual({ code: 'other', message: 'Garmin API GET /x failed with HTTP 500' });

    const b = fakeProcess();
    const job2 = createSyncJob({ spawner: () => b.proc, now: clock });
    job2.start();
    b.exit(1);
    expect(job2.status()).toMatchObject({ state: 'failed', error: { code: 'other' } });
  });

  it('runs a rebuild-only job, and queues one requested during a sync until it ends', () => {
    const kinds: string[] = [];
    const procs = [fakeProcess(), fakeProcess(), fakeProcess()];
    const job = createSyncJob({ spawner: (kind) => (kinds.push(kind), procs[kinds.length - 1]!.proc), now: clock });

    expect(job.requestRebuild()).toMatchObject({ state: 'running', kind: 'rebuild', stage: 'rebuilding' });
    procs[0]!.emit({ stage: 'done', newActivities: 0, downloaded: 0, activities: 10 });
    procs[0]!.exit(0);
    expect(job.status()).toMatchObject({ state: 'succeeded', kind: 'rebuild' });

    job.start();
    expect(job.requestRebuild()).toMatchObject({ kind: 'sync', rebuildQueued: true });
    expect(kinds).toEqual(['rebuild', 'sync']);
    procs[1]!.emit({ stage: 'done', newActivities: 1, downloaded: 1, activities: 11 });
    procs[1]!.exit(0);
    // The queued rebuild starts as soon as the sync ends.
    expect(kinds).toEqual(['rebuild', 'sync', 'rebuild']);
    expect(job.status()).toMatchObject({ state: 'running', kind: 'rebuild', rebuildQueued: false });
  });

  it('explains a failed rebuild in its own words', () => {
    const fake = fakeProcess();
    const job = createSyncJob({ spawner: () => fake.proc, now: clock });
    job.requestRebuild();
    fake.exit(1);
    expect(job.status().error?.message).toMatch(/npm run rebuild/);
  });
});
