import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GarminHttpError, GarminKeyRejectedError } from '../src/garmin/errors.js';
import { classifySyncError } from '../src/sync/classifyError.js';
import { acquireSyncLock, STALE_LOCK_MS, SyncLockedError } from '../src/sync/lock.js';
import { useTempDir } from './helpers.js';

describe('acquireSyncLock', () => {
  const tempDir = useTempDir();

  it('allows one holder at a time and releases', async () => {
    const dir = tempDir();
    const release = await acquireSyncLock(dir, { alive: () => true });
    await expect(acquireSyncLock(dir, { alive: () => true })).rejects.toBeInstanceOf(SyncLockedError);
    await release();
    const again = await acquireSyncLock(dir, { alive: () => true });
    await again();
  });

  it('replaces a lock from a dead process or one older than 30 minutes', async () => {
    const dir = tempDir();
    const file = path.join(dir, 'sync.lock');
    await writeFile(file, JSON.stringify({ pid: 999999, startedAt: new Date().toISOString() }));
    const r1 = await acquireSyncLock(dir, { alive: () => false });
    expect(JSON.parse(await readFile(file, 'utf8')).pid).toBe(process.pid);
    await r1();

    const t0 = Date.parse('2026-11-07T10:00:00Z');
    await writeFile(file, JSON.stringify({ pid: 1, startedAt: new Date(t0).toISOString() }));
    const r2 = await acquireSyncLock(dir, { alive: () => true, now: () => t0 + STALE_LOCK_MS + 1 });
    await r2();
  });
});

describe('classifySyncError', () => {
  it('maps failures to codes the UI can explain', () => {
    expect(classifySyncError(new SyncLockedError())).toBe('locked');
    expect(classifySyncError(new GarminKeyRejectedError())).toBe('key');
    expect(classifySyncError(new GarminHttpError(429, 'GET', '/x'))).toBe('rate');
    expect(classifySyncError(new GarminHttpError(500, 'GET', '/x'))).toBe('other');
    expect(classifySyncError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }))).toBe(
      'offline',
    );
    expect(classifySyncError(new Error('something else'))).toBe('other');
  });
});
