import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createManifestStore, createSettingsStore } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { rebuild } from '../src/rebuild/rebuild.js';
import { makeFitFile, useTempDir } from './helpers.js';

const fixture = async () =>
  JSON.parse(await readFile(new URL('./fixtures/activity-list.json', import.meta.url), 'utf8')) as Array<
    Record<string, unknown>
  >;

const TODAY = '2026-11-06';

/** An outdoor ride with GPS, power and HR, and an indoor ride with power: real FIT files. */
async function seed(dir: string) {
  const [outdoor, indoor] = await fixture();
  await mkdir(path.join(dir, 'raw'), { recursive: true });
  await mkdir(path.join(dir, 'fit'), { recursive: true });
  await writeFile(
    path.join(dir, 'raw', '10000000001.json'),
    JSON.stringify({ ...outdoor, startLatitude: 60.17, startLongitude: 24.94 }),
  );
  await writeFile(path.join(dir, 'raw', '10000000002.json'), JSON.stringify(indoor));
  const gps = Array.from({ length: 600 }, (_, i) => ({
    offsetS: i,
    power: 180,
    heartRate: 140,
    speed: 8,
    distance: i * 8,
    lat: 60.17 + i * 0.00007,
    lng: 24.94 + (i % 100 === 0 ? 0.0005 : 0),
  }));
  await writeFile(path.join(dir, 'fit', '10000000001.fit'), makeFitFile(gps));
  await writeFile(
    path.join(dir, 'fit', '10000000002.fit'),
    makeFitFile(Array.from({ length: 900 }, (_, i) => ({ offsetS: i, power: 200, heartRate: 150 }))),
  );
  await createSettingsStore(dir).upsertFtp({ from: '2026-10-01', watts: 200, source: 'manual' });
  return { outdoor, indoor };
}

/** Every derived file's bytes, with generatedAt timestamps blanked so runs can be compared. */
async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const sub of ['activities', 'streams', 'routes', 'derived']) {
    const files = await readdir(path.join(dir, sub)).catch(() => [] as string[]);
    for (const f of files.sort()) {
      const bytes = await readFile(path.join(dir, sub, f));
      out[`${sub}/${f}`] = f.endsWith('.gz')
        ? bytes.toString('base64')
        : bytes.toString('utf8').replace(/"generatedAt": ?"[^"]*"/g, '"generatedAt":""');
    }
  }
  out['index.json'] = (await readFile(path.join(dir, 'index.json'), 'utf8')).replace(
    /"generatedAt": ?"[^"]*"/g,
    '"generatedAt":""',
  );
  return out;
}

describe('incremental rebuild', () => {
  const tempDir = useTempDir();

  it('reuses everything when nothing changed, with output identical to a full rebuild', async () => {
    const dir = tempDir();
    await seed(dir);
    const full = await rebuild(dir, () => {}, { today: TODAY });
    expect(full).toMatchObject({ mode: 'full', parsed: 2, reused: 0 });
    const before = await snapshot(dir);

    const inc = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(inc).toMatchObject({
      mode: 'incremental',
      parsed: 0,
      recomputed: 0,
      reused: 2,
      activities: 2,
      heatmapRoutes: 1,
    });
    expect(await snapshot(dir)).toEqual(before);
  });

  it('parses only a new ride, and matches a full rebuild of the same data', async () => {
    const dir = tempDir();
    const { indoor } = await seed(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    await writeFile(
      path.join(dir, 'raw', '10000000003.json'),
      JSON.stringify({
        ...indoor,
        activityId: 10000000003,
        startTimeLocal: '2026-11-02 18:00:00',
        startTimeGMT: '2026-11-02 16:00:00',
      }),
    );
    await writeFile(
      path.join(dir, 'fit', '10000000003.fit'),
      makeFitFile(Array.from({ length: 300 }, (_, i) => ({ offsetS: i, power: 250 }))),
    );

    const inc = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(inc).toMatchObject({ parsed: 1, reused: 2, activities: 3 });
    const afterIncremental = await snapshot(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    expect(await snapshot(dir)).toEqual(afterIncremental);
  });

  it('keeps a manual entry whose FIT file has no records, without counting it as a problem', async () => {
    const dir = tempDir();
    const { indoor } = await seed(dir);
    const manual = { ...indoor, activityId: 10000000004, startTimeLocal: '2026-11-03 18:00:00', manualActivity: true };
    await writeFile(path.join(dir, 'raw', '10000000004.json'), JSON.stringify(manual));
    await writeFile(path.join(dir, 'fit', '10000000004.fit'), makeFitFile([]));

    const expected = { activities: 3, withStreams: 2, withoutRecords: 1, failed: [] };
    expect(await rebuild(dir, () => {}, { today: TODAY })).toMatchObject(expected);
    expect(await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' })).toMatchObject({
      ...expected,
      reused: 3,
    });
    const streams = await readdir(path.join(dir, 'streams'));
    expect(streams.some((f) => f.startsWith('10000000004'))).toBe(false);
  });

  it('re-processes a ride whose raw summary changed (e.g. renamed in Garmin Connect)', async () => {
    const dir = tempDir();
    const { indoor } = await seed(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    await writeFile(path.join(dir, 'raw', '10000000002.json'), JSON.stringify({ ...indoor, activityName: 'Renamed' }));
    const inc = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(inc).toMatchObject({ parsed: 1, reused: 1 });
    const a = JSON.parse(await readFile(path.join(dir, 'activities', '10000000002.json'), 'utf8')) as { name: string };
    expect(a.name).toBe('Renamed');
  });

  it('recomputes from stored streams without parsing FIT files when the FTP changes', async () => {
    const dir = tempDir();
    await seed(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    await createSettingsStore(dir).upsertFtp({ from: '2026-10-01', watts: 250, source: 'manual' });
    const inc = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(inc).toMatchObject({ parsed: 0, recomputed: 2, reused: 0 });
    const afterIncremental = await snapshot(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    expect(await snapshot(dir)).toEqual(afterIncremental);
  });

  it('falls back to a full rebuild without a manifest or with another derived version', async () => {
    const dir = tempDir();
    await seed(dir);
    expect((await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' })).mode).toBe('full');
    const store = createManifestStore(dir);
    await store.write({ ...(await store.read())!, derivedVersion: 'old' });
    expect(await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' })).toMatchObject({
      mode: 'full',
      parsed: 2,
    });
  });

  it('removes the derived files of a ride that is gone from raw/', async () => {
    const dir = tempDir();
    await seed(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    await rm(path.join(dir, 'raw', '10000000001.json'));
    const inc = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(inc).toMatchObject({ activities: 1, heatmapRoutes: 0 });
    expect(await readdir(path.join(dir, 'activities'))).toEqual(['10000000002.json']);
    expect(await readdir(path.join(dir, 'routes'))).toEqual([]);
  });
});
