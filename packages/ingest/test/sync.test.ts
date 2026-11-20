import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createFitStore, createRawStore, createSyncStateStore, toActivityId, type ActivityId } from '@app/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GarminClient, SearchParams } from '../src/garmin/client.js';
import { GarminHttpError, GarminKeyRejectedError } from '../src/garmin/errors.js';
import { backfill } from '../src/sync/backfill.js';
import { addDays } from '../src/sync/dates.js';
import { incremental } from '../src/sync/incremental.js';
import { retryFailed, type SyncDeps } from '../src/sync/syncRange.js';
import { makeFit, makeZip, useTempDir } from './helpers.js';

const TODAY = '2026-11-04';

interface FakeActivity {
  id: number;
  date: string;
}

/** Fake Garmin with activities on given dates. Supports paging and failure injection. */
function fakeGarmin(activities: FakeActivity[]) {
  const failDownload = new Map<number, Error>();
  const searches: SearchParams[] = [];
  const downloads: ActivityId[] = [];
  const client: GarminClient = {
    searchActivitiesRaw: async () => [],
    searchActivities: vi.fn(async (p: SearchParams) => {
      searches.push(p);
      return activities
        .filter((a) => a.date >= p.startDate && a.date <= p.endDate)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .slice(p.start, p.start + p.limit)
        .map((a) => ({ id: toActivityId(a.id), raw: { activityId: a.id, startTimeLocal: `${a.date} 08:00:00` } }));
    }),
    downloadActivity: vi.fn(async (id: ActivityId) => {
      downloads.push(id);
      const err = failDownload.get(Number(id));
      if (err) throw err;
      return { bytes: makeZip({ [`${id}_ACTIVITY.fit`]: makeFit(`fit-${id}`) }), contentType: 'application/zip' };
    }),
  };
  return { client, searches, downloads, failDownload };
}

const tempDir = useTempDir();
let dataDir: string;
beforeEach(() => {
  dataDir = tempDir();
});

function deps(client: GarminClient, extra: Partial<SyncDeps> = {}): SyncDeps {
  return {
    client,
    raw: createRawStore(dataDir),
    fit: createFitStore(dataDir),
    state: createSyncStateStore(dataDir),
    log: () => {},
    today: () => TODAY,
    nowIso: () => '2026-11-04T12:00:00.000Z',
    pageSize: 2,
    ...extra,
  };
}

const ls = async (sub: string) => (await readdir(path.join(dataDir, sub)).catch(() => [])).sort();

describe('backfill', () => {
  const activities = [
    { id: 1, date: '2026-11-04' },
    { id: 2, date: '2026-11-04' },
    { id: 3, date: '2026-11-03' },
    { id: 4, date: '2026-10-01' },
    { id: 5, date: '2026-09-20' },
    { id: 6, date: '2026-01-01' }, // older than `since`
  ];

  it('walks backwards in 30-day chunks, paging within each chunk', async () => {
    const g = fakeGarmin(activities);
    const counts = await backfill(deps(g.client), { since: '2026-09-01' });

    expect(counts).toEqual({ listed: 5, downloaded: 5, failed: 0 });
    const ranges = [...new Set(g.searches.map((s) => `${s.startDate}..${s.endDate}`))];
    expect(ranges).toEqual(['2026-10-06..2026-11-04', '2026-09-06..2026-10-05', '2026-09-01..2026-09-05']);
    // 3 activities in the first chunk with page size 2 gives two pages.
    expect(g.searches.filter((s) => s.endDate === TODAY).map((s) => s.start)).toEqual([0, 2]);

    expect(await ls('raw')).toEqual(['1.json', '2.json', '3.json', '4.json', '5.json']);
    expect(await ls('fit')).toEqual(['1.fit', '2.fit', '3.fit', '4.fit', '5.fit']);
    const fit = await readFile(path.join(dataDir, 'fit', '4.fit'));
    expect(fit.equals(Buffer.from(makeFit('fit-4')))).toBe(true);

    const state = await createSyncStateStore(dataDir).read();
    expect(state).toMatchObject({ newestDone: TODAY, oldestDone: '2026-09-01', failed: {} });
  });

  it('stores the raw list item as received', async () => {
    const g = fakeGarmin([{ id: 9, date: TODAY }]);
    await backfill(deps(g.client), { since: TODAY });
    const raw = JSON.parse(await readFile(path.join(dataDir, 'raw', '9.json'), 'utf8')) as unknown;
    expect(raw).toEqual({ activityId: 9, startTimeLocal: `${TODAY} 08:00:00` });
  });

  it('is idempotent: a re-run downloads nothing and leaves files byte-identical', async () => {
    const g = fakeGarmin(activities);
    await backfill(deps(g.client), { since: '2026-09-01' });
    const before = await readFile(path.join(dataDir, 'raw', '3.json'));
    const fitMtime = (await stat(path.join(dataDir, 'fit', '3.fit'))).mtimeMs;

    // Clear the cursor so the same ranges are walked again.
    const store = createSyncStateStore(dataDir);
    await store.write({ ...(await store.read()), oldestDone: null });
    g.downloads.length = 0;
    await backfill(deps(g.client), { since: '2026-09-01' });

    expect(g.downloads).toEqual([]);
    expect((await readFile(path.join(dataDir, 'raw', '3.json'))).equals(before)).toBe(true);
    expect((await stat(path.join(dataDir, 'fit', '3.fit'))).mtimeMs).toBe(fitMtime);
  });

  it('--refetch re-downloads existing FIT files', async () => {
    const g = fakeGarmin([{ id: 1, date: TODAY }]);
    await backfill(deps(g.client), { since: TODAY });
    await createSyncStateStore(dataDir).write({ ...(await createSyncStateStore(dataDir).read()), oldestDone: null });
    await backfill(deps(g.client, { refetch: true }), { since: TODAY });
    expect(g.downloads).toEqual(['1', '1']);
  });

  it('resumes below the last completed chunk after an interruption', async () => {
    const g = fakeGarmin(activities);
    const original = g.client.searchActivities;
    let calls = 0;
    g.client.searchActivities = async (p) => {
      if (p.endDate === '2026-10-05' && calls++ === 0) throw new Error('process killed');
      return original(p);
    };

    await expect(backfill(deps(g.client), { since: '2026-09-01' })).rejects.toThrow('process killed');
    expect((await createSyncStateStore(dataDir).read()).oldestDone).toBe('2026-10-06');

    g.searches.length = 0;
    await backfill(deps(g.client), { since: '2026-09-01' });
    expect(g.searches.some((s) => s.endDate === TODAY)).toBe(false);
    expect(await ls('fit')).toEqual(['1.fit', '2.fit', '3.fit', '4.fit', '5.fit']);
  });

  it('extends further back when called with an older since', async () => {
    const g = fakeGarmin(activities);
    await backfill(deps(g.client), { since: '2026-09-01' });
    g.searches.length = 0;
    await backfill(deps(g.client), { since: '2025-12-01' });
    expect(g.searches[0]?.endDate).toBe('2026-08-31');
    expect(await ls('fit')).toContain('6.fit');
  });

  it('records per-activity failures and carries on', async () => {
    const g = fakeGarmin(activities);
    g.failDownload.set(3, new Error('corrupt download'));
    const counts = await backfill(deps(g.client), { since: '2026-09-01' });

    expect(counts.failed).toBe(1);
    expect(await ls('fit')).not.toContain('3.fit');
    expect(await ls('raw')).toContain('3.json');
    expect((await createSyncStateStore(dataDir).read()).failed).toEqual({
      '3': { attempts: 1, lastError: 'corrupt download' },
    });
  });

  it.each([
    ['a rejected key', new GarminKeyRejectedError()],
    ['exhausted rate limiting', new GarminHttpError(429, 'GET', '/x')],
  ])('aborts on %s', async (_label, err) => {
    const g = fakeGarmin(activities);
    g.failDownload.set(1, err);
    await expect(backfill(deps(g.client), { since: '2026-09-01' })).rejects.toBe(err);
  });
});

describe('incremental', () => {
  it('requires a previous backfill', async () => {
    await expect(incremental(deps(fakeGarmin([]).client))).rejects.toThrow(/backfill first/);
  });

  it('re-checks from newestDone minus the overlap up to today', async () => {
    const g = fakeGarmin([
      { id: 1, date: '2026-10-30' },
      { id: 2, date: TODAY },
    ]);
    const store = createSyncStateStore(dataDir);
    await store.write({ ...(await store.read()), newestDone: '2026-10-25', oldestDone: '2026-01-01' });

    await incremental(deps(g.client));
    const ranges = new Set(g.searches.map((s) => `${s.startDate}..${s.endDate}`));
    expect([...ranges]).toEqual([`${addDays('2026-10-25', -2)}..${TODAY}`]);
    expect(await ls('fit')).toEqual(['1.fit', '2.fit']);
    expect((await store.read()).newestDone).toBe(TODAY);
  });
});

describe('retryFailed', () => {
  it('retries failed FIT downloads and clears them on success', async () => {
    const g = fakeGarmin([{ id: 3, date: TODAY }]);
    g.failDownload.set(3, new Error('flaky'));
    await backfill(deps(g.client), { since: TODAY });
    expect(await ls('fit')).toEqual([]);

    g.failDownload.clear();
    const counts = await retryFailed(deps(g.client));
    expect(counts).toEqual({ listed: 1, downloaded: 1, failed: 0 });
    expect(await ls('fit')).toEqual(['3.fit']);
    expect((await createSyncStateStore(dataDir).read()).failed).toEqual({});
  });

  it('increments attempts when a retry fails again', async () => {
    const g = fakeGarmin([{ id: 3, date: TODAY }]);
    g.failDownload.set(3, new Error('flaky'));
    await backfill(deps(g.client), { since: TODAY });
    await retryFailed(deps(g.client));
    expect((await createSyncStateStore(dataDir).read()).failed['3']?.attempts).toBe(2);
  });
});
