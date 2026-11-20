import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createIndexStore, INDEX_SCHEMA_VERSION } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createIndexCache } from '../src/indexCache.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'training-base-index-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const writeIndex = (generatedAt: string) =>
  createIndexStore(dir).write({ schemaVersion: INDEX_SCHEMA_VERSION, generatedAt, activities: [] });

describe('index cache', () => {
  it('gives requests made together the reloaded index, not the old one', async () => {
    let clock = 0;
    const cache = createIndexCache(dir, { checkIntervalMs: 2000, now: () => clock });
    await writeIndex('2026-11-01T00:00:00.000Z');
    expect((await cache.get()).generatedAt).toBe('2026-11-01T00:00:00.000Z');

    await writeIndex('2026-11-02T00:00:00.000Z');
    clock = 5000;
    const [first, second] = await Promise.all([cache.get(), cache.get()]);

    expect(first.generatedAt).toBe('2026-11-02T00:00:00.000Z');
    expect(second.generatedAt).toBe('2026-11-02T00:00:00.000Z');
  });
});
