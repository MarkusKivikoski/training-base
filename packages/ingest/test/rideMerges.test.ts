import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createActivityStore,
  createIndexStore,
  createSettingsStore,
  createStreamStore,
  type ActivityId,
} from '@app/shared';
import { describe, expect, it } from 'vitest';
import { rebuild } from '../src/rebuild/rebuild.js';
import { makeFitFile, useTempDir } from './helpers.js';

const TODAY = '2026-11-06';
const FIRST = '10000000001';
const SECOND = '10000000005';

const fixture = async () =>
  JSON.parse(await readFile(new URL('./fixtures/activity-list.json', import.meta.url), 'utf8')) as Array<
    Record<string, unknown>
  >;

/** Ten minutes of riding north at 8 m/s, starting `offsetS` after FIT_START (07:00 UTC). */
const riding = (offsetS: number, latStart: number) =>
  Array.from({ length: 600 }, (_, i) => ({
    offsetS: offsetS + i,
    power: 200,
    heartRate: 140,
    speed: 8,
    distance: i * 8,
    lat: latStart + i * 0.00007,
    lng: 24.94,
  }));

/** One outdoor ride recorded in two parts: 07:00–07:10, then 07:20–07:30 after a stop. */
async function seedSplitRide(dir: string) {
  const [outdoor] = await fixture();
  await mkdir(path.join(dir, 'raw'), { recursive: true });
  await mkdir(path.join(dir, 'fit'), { recursive: true });
  const part = (id: string, startGmt: string, startLocal: string) => ({
    ...outdoor,
    activityId: Number(id),
    startTimeGMT: startGmt,
    startTimeLocal: startLocal,
    duration: 600,
    movingDuration: 600,
    distance: 4792,
    startLatitude: 60.17,
    startLongitude: 24.94,
  });
  await writeFile(
    path.join(dir, 'raw', `${FIRST}.json`),
    JSON.stringify(part(FIRST, '2026-11-01 07:00:00', '2026-11-01 09:00:00')),
  );
  await writeFile(
    path.join(dir, 'raw', `${SECOND}.json`),
    JSON.stringify(part(SECOND, '2026-11-01 07:20:00', '2026-11-01 09:20:00')),
  );
  await writeFile(path.join(dir, 'fit', `${FIRST}.fit`), makeFitFile(riding(0, 60.17)));
  await writeFile(path.join(dir, 'fit', `${SECOND}.fit`), makeFitFile(riding(1200, 60.2035)));
  await createSettingsStore(dir).upsertFtp({ from: '2026-10-01', watts: 200, source: 'manual' });
}

const indexIds = async (dir: string) => (await createIndexStore(dir).read()).activities.map((a) => a.id);

describe('rebuild with merged rides', () => {
  const tempDir = useTempDir();

  it('joins the recordings into one ride under the first one’s id', async () => {
    const dir = tempDir();
    await seedSplitRide(dir);
    await createSettingsStore(dir).writeRideMerges([[FIRST, SECOND]]);

    const result = await rebuild(dir, () => {}, { today: TODAY });

    expect(result).toMatchObject({ activities: 1, withStreams: 1, failed: [] });
    expect(await indexIds(dir)).toEqual([FIRST]);
    const ride = await createActivityStore(dir).read(FIRST as ActivityId);
    expect(ride).toMatchObject({
      durationS: 1200,
      distanceM: 9584,
      mergedFrom: [
        { id: FIRST, startS: 0, durationS: 600 },
        { id: SECOND, startS: 1200, durationS: 600 },
      ],
    });
    // Power metrics come from the joined stream: 20 minutes of riding at FTP.
    expect(ride?.metrics?.ridingTimeS).toBe(1200);
    expect(ride?.metrics?.np).toBe(200);

    const stream = await createStreamStore(dir).read(FIRST as ActivityId);
    expect(stream?.time.length).toBe(1200);
    expect(stream?.time[600]).toBe(1200); // nothing recorded during the stop
    expect(stream?.distance?.[600]).toBe(4792); // the second part's distance continues
    expect(stream?.distance?.at(-1)).toBe(9584);
    expect(await createActivityStore(dir).read(SECOND as ActivityId)).toBeNull();
  });

  it('reuses an unchanged merge, and splits it again when the merge is removed', async () => {
    const dir = tempDir();
    await seedSplitRide(dir);
    await rebuild(dir, () => {}, { today: TODAY });
    expect(await indexIds(dir)).toEqual([SECOND, FIRST]);

    await createSettingsStore(dir).writeRideMerges([[FIRST, SECOND]]);
    const merged = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(merged).toMatchObject({ mode: 'incremental', parsed: 1, activities: 1 });
    expect(await createActivityStore(dir).read(SECOND as ActivityId)).toBeNull();

    const again = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(again).toMatchObject({ parsed: 0, reused: 1 });

    await createSettingsStore(dir).writeRideMerges([]);
    const split = await rebuild(dir, () => {}, { today: TODAY, mode: 'incremental' });
    expect(split).toMatchObject({ parsed: 2, activities: 2 });
    expect(await indexIds(dir)).toEqual([SECOND, FIRST]);
    expect((await createActivityStore(dir).read(FIRST as ActivityId))?.mergedFrom).toBeNull();
  });

  it('leaves the recordings apart when one of them is not in raw/', async () => {
    const dir = tempDir();
    await seedSplitRide(dir);
    await createSettingsStore(dir).writeRideMerges([[FIRST, '10000000099']]);
    const messages: string[] = [];

    await rebuild(dir, (message) => messages.push(message), { today: TODAY });

    expect(await indexIds(dir)).toEqual([SECOND, FIRST]);
    expect(messages.join('\n')).toMatch(/10000000099 not in raw/);
  });
});
