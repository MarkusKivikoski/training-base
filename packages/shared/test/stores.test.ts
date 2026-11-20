import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toActivityId } from '../src/activityId.js';
import { readConfig } from '../src/config.js';
import { atomicWrite } from '../src/store/atomicWrite.js';
import { createFitStore } from '../src/store/fitStore.js';
import { createRawStore } from '../src/store/rawStore.js';
import { createSyncStateStore, initialSyncState } from '../src/store/syncStateStore.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'training-base-shared-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('atomicWrite', () => {
  it('creates parent directories and writes the content', async () => {
    const file = path.join(dir, 'a', 'b', 'x.json');
    await atomicWrite(file, 'hello');
    expect(await readFile(file, 'utf8')).toBe('hello');
  });

  it('replaces an existing file and leaves no temp files', async () => {
    const file = path.join(dir, 'x.json');
    await atomicWrite(file, 'one');
    await atomicWrite(file, new Uint8Array([116, 119, 111]));
    expect(await readFile(file, 'utf8')).toBe('two');
    expect(await readdir(dir)).toEqual(['x.json']);
  });

  it('removes the temp file and keeps the old content when the rename fails', async () => {
    // Renaming a file onto an existing directory fails on every platform.
    const target = path.join(dir, 'target');
    await atomicWrite(path.join(target, 'inner'), 'x');
    await expect(atomicWrite(target, 'data')).rejects.toThrow();
    expect(await readdir(dir)).toEqual(['target']);
  });
});

describe('toActivityId', () => {
  it('accepts positive integers', () => {
    expect(toActivityId(123)).toBe('123');
    expect(toActivityId('987654321012')).toBe('987654321012');
  });
  it.each(['../x', '0', '-1', 'abc', '１２３', '1.5', ''])('rejects %j', (v) => {
    expect(() => toActivityId(v)).toThrow(/positive integer/);
  });
  it('rejects unsafe or non-integer numbers', () => {
    expect(() => toActivityId(1.5)).toThrow();
    expect(() => toActivityId(2 ** 60)).toThrow();
  });
});

describe('raw and fit stores', () => {
  it('round-trip by activity ID', async () => {
    const id = toActivityId(42);
    const raw = createRawStore(dir);
    const fit = createFitStore(dir);
    expect(await raw.has(id)).toBe(false);
    await raw.write(id, { activityId: 42 });
    await fit.write(id, new Uint8Array([1, 2]));
    expect(await raw.has(id)).toBe(true);
    expect(await fit.has(id)).toBe(true);
    expect(JSON.parse(await readFile(raw.fileFor(id), 'utf8'))).toEqual({ activityId: 42 });
    expect([...(await readFile(fit.fileFor(id)))]).toEqual([1, 2]);
  });
});

describe('rawStore key order', () => {
  it('writes byte-identical files when Garmin reorders keys', async () => {
    const raw = createRawStore(dir);
    const id = toActivityId(7);
    await raw.write(id, { b: 1, a: { y: [3, { d: 1, c: 2 }], x: null } });
    const first = await readFile(raw.fileFor(id));
    await raw.write(id, { a: { x: null, y: [3, { c: 2, d: 1 }] }, b: 1 });
    expect((await readFile(raw.fileFor(id))).equals(first)).toBe(true);
    // Array order is data, so it is preserved.
    expect(JSON.parse(first.toString())).toEqual({ a: { x: null, y: [3, { c: 2, d: 1 }] }, b: 1 });
  });
});

describe('syncStateStore', () => {
  it('returns the initial state when the file is missing', async () => {
    expect(await createSyncStateStore(dir).read()).toEqual(initialSyncState());
  });

  it('round-trips state', async () => {
    const store = createSyncStateStore(dir);
    const state = {
      ...initialSyncState(),
      newestDone: '2026-11-04',
      oldestDone: '2021-11-05',
      failed: { '1': { attempts: 2, lastError: 'x' } },
      lastSyncAt: '2026-11-04T12:00:00.000Z',
    };
    await store.write(state);
    expect(await store.read()).toEqual(state);
  });

  it.each([
    ['invalid JSON', '{nope'],
    ['another schema version', JSON.stringify({ ...initialSyncState(), schemaVersion: 2 })],
    ['a bad date', JSON.stringify({ ...initialSyncState(), newestDone: '04.11.2026' })],
  ])('rejects %s with a clear message', async (_label, content) => {
    const store = createSyncStateStore(dir);
    await writeFile(store.file, content);
    await expect(store.read()).rejects.toThrow(/Delete it to restart the sync/);
  });
});

describe('readConfig', () => {
  it('applies defaults and strips a trailing slash from the base URL', () => {
    const c = readConfig({ GARMIN_PERSONAL_API_BASE_URL: 'https://example.test/' });
    expect(c.garminBaseUrl).toBe('https://example.test');
    expect(c.garminApiKey).toBeUndefined();
    expect(path.basename(c.dataDir)).toBe('data');
  });

  it('names an invalid variable without echoing its value', () => {
    expect(() => readConfig({ GARMIN_PERSONAL_API_BASE_URL: 'secret-not-a-url' })).toThrow(
      /^Invalid environment configuration: GARMIN_PERSONAL_API_BASE_URL$/,
    );
  });
});
