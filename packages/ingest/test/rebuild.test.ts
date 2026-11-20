import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  activitySummarySchema,
  createActivityStore,
  createFitStore,
  createHeatmapStore,
  createIndexStore,
  createLoadStore,
  createSettingsStore,
} from '@app/shared';
import { describe, expect, it } from 'vitest';
import { rebuild } from '../src/rebuild/rebuild.js';
import { summaryFromRaw } from '../src/rebuild/summaryFromRaw.js';
import { haversineM } from '../src/fit/trimRoute.js';
import { makeFitFile, useTempDir } from './helpers.js';

const fixture = async () =>
  JSON.parse(await readFile(new URL('./fixtures/activity-list.json', import.meta.url), 'utf8')) as Array<
    Record<string, unknown>
  >;

describe('summaryFromRaw', () => {
  it('maps an outdoor ride', async () => {
    const [outdoor] = await fixture();
    const s = summaryFromRaw({ ...outdoor, startLatitude: 60.17, elevationGain: 350, sportTypeId: 2 });
    expect(activitySummarySchema.parse(s)).toEqual(s);
    expect(s).toMatchObject({
      id: '10000000001',
      name: 'Example Ride',
      sport: 'cycling',
      isCycling: true,
      isRunning: false,
      isIndoor: false,
      startTimeLocal: '2026-11-01T09:00:00',
      startTimeUtc: '2026-11-01T07:00:00.000Z',
      date: '2026-11-01',
      durationS: 5400,
      distanceM: 42000,
      elevationGainM: 350,
      avgCadence: 88,
      hasPower: true,
      metrics: null,
      meanMaxPower: null,
    });
  });

  it('marks indoor sport types and rides without GPS as indoor', async () => {
    const [outdoor, indoor] = await fixture();
    expect(summaryFromRaw(indoor).isIndoor).toBe(true);
    // An outdoor type key without a start position counts as indoor too.
    expect(summaryFromRaw(outdoor).isIndoor).toBe(true);
  });

  it('ignores Garmin-computed power metrics', async () => {
    const [outdoor] = await fixture();
    const s = summaryFromRaw(outdoor);
    expect(s.metrics).toBeNull();
    expect(JSON.stringify(s)).not.toContain('trainingStressScore');
  });

  it('treats non-bike sports as non-cycling and missing fields as null', () => {
    const s = summaryFromRaw({
      activityId: 5,
      activityName: null,
      startTimeLocal: '2026-11-03 18:00:00',
      startTimeGMT: '2026-11-03 16:00:00',
      activityType: { typeKey: 'strength_training', typeId: 13, parentTypeId: 29 },
      sportTypeId: 4,
      duration: 1800,
    });
    expect(s).toMatchObject({
      name: 'strength training',
      isCycling: false,
      isRunning: false,
      isIndoor: true,
      avgPower: null,
      hasPower: false,
      activeCalories: null,
    });
  });

  it('reports active calories: total minus resting (BMR) calories', async () => {
    const [a] = await fixture();
    expect(summaryFromRaw({ ...a, calories: 480, bmrCalories: 76 }).activeCalories).toBe(404);
    // Without the resting part, the total would overstate active calories, so it stays empty.
    expect(summaryFromRaw({ ...a, calories: 480 }).activeCalories).toBeNull();
  });

  it('rejects summaries missing required fields', () => {
    expect(() => summaryFromRaw({ activityId: 1 })).toThrow(/unexpected shape/);
  });
});

describe('rebuild', () => {
  const tempDir = useTempDir();

  it('writes activities/ and a newest-first index from raw/, keeping settings', async () => {
    const dir = tempDir();
    const [a, b] = await fixture();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000001.json'), JSON.stringify(a));
    await writeFile(path.join(dir, 'raw', '10000000002.json'), JSON.stringify(b));
    await writeFile(path.join(dir, 'raw', '3.json'), JSON.stringify({ activityId: 3 }));
    await createSettingsStore(dir).upsertFtp({ from: '2026-10-01', watts: 199, source: 'manual' });
    // A stale derived file from an earlier run must disappear.
    await mkdir(path.join(dir, 'activities'), { recursive: true });
    await writeFile(path.join(dir, 'activities', '999.json'), '{}');

    const result = await rebuild(dir);

    expect(result.activities).toBe(2);
    expect(result.failed.map((f) => f.id)).toEqual(['3']);
    const index = await createIndexStore(dir).read();
    expect(index.activities.map((x) => x.id)).toEqual(['10000000001', '10000000002']);
    expect((await createActivityStore(dir).readAll()).map((x) => x.id).sort()).toEqual(['10000000001', '10000000002']);
    expect(await createSettingsStore(dir).readFtp()).toHaveLength(1);
  });

  it('is idempotent apart from generatedAt', async () => {
    const dir = tempDir();
    const [a] = await fixture();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000001.json'), JSON.stringify(a));
    await rebuild(dir);
    const first = await readFile(createActivityStore(dir).fileFor('10000000001' as never));
    await rebuild(dir);
    expect((await readFile(createActivityStore(dir).fileFor('10000000001' as never))).equals(first)).toBe(true);
  });

  it('writes daily load from the first day with load through today', async () => {
    const dir = tempDir();
    const [a] = await fixture();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000001.json'), JSON.stringify(a));
    // No FIT file and no FTP, so nothing has load yet.
    await rebuild(dir, () => {}, { today: '2026-11-05' });
    expect((await createLoadStore(dir).read()).days).toEqual([]);
  });

  it('stores an LTHR estimate from the best 20-minute power window', async () => {
    const dir = tempDir();
    const [a, b] = await fixture();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000001.json'), JSON.stringify(a));
    await writeFile(path.join(dir, 'raw', '10000000002.json'), JSON.stringify(b));
    // 25 minutes: easy, then 20 minutes hard at 170 bpm, then easy again.
    const records = Array.from({ length: 1500 }, (_, i) => {
      const isHard = i >= 120 && i < 1320;
      return { offsetS: i, power: isHard ? 260 : 120, heartRate: isHard ? 170 : 130 };
    });
    await createFitStore(dir).write('10000000001' as never, makeFitFile(records));
    await rebuild(dir, () => {}, { today: '2026-11-02' });
    const ride = (await createActivityStore(dir).readAll()).find((x) => x.id === '10000000001')!;
    expect(ride.lthrEstimate).toEqual({ bpm: 161.5, avgHr: 170 });
    const other = (await createActivityStore(dir).readAll()).find((x) => x.id === '10000000002')!;
    expect(other.lthrEstimate).toBeNull();
  });

  it('keeps heart-rate load from other sports out of cycling load, in the all-activities series', async () => {
    const dir = tempDir();
    const [a] = await fixture();
    const strength = {
      ...a,
      activityId: 10000000009,
      sportTypeId: 4,
      activityType: { typeKey: 'strength_training', typeId: 13, parentTypeId: 29 },
    };
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000009.json'), JSON.stringify(strength));
    // 30 min at the LTHR: about 50 TSS.
    await createFitStore(dir).write(
      '10000000009' as never,
      makeFitFile(Array.from({ length: 1800 }, (_, i) => ({ offsetS: i, heartRate: 160 }))),
    );
    await createSettingsStore(dir).upsertLthr({ from: '2026-10-01', bpm: 160, source: 'manual' });
    await rebuild(dir, () => {}, { today: '2026-11-02' });
    const load = await createLoadStore(dir).read();
    expect(load.days).toEqual([]);
    expect(load.allActivities.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(load.allActivities[0]!.tss).toBeGreaterThan(40);
    expect(load.allActivities[0]!.tss).toBeLessThan(60);
  });

  it('writes outdoor rides with GPS to derived/heatmap.json, trimmed by settings/app.json', async () => {
    const dir = tempDir();
    const [outdoor, indoor] = await fixture();
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(
      path.join(dir, 'raw', '10000000001.json'),
      JSON.stringify({ ...outdoor, startLatitude: 60.17, startLongitude: 24.94 }),
    );
    await writeFile(path.join(dir, 'raw', '10000000002.json'), JSON.stringify(indoor));
    const run = {
      ...outdoor,
      activityId: 10000000003,
      sportTypeId: 1,
      activityType: { typeKey: 'running', typeId: 1, parentTypeId: 17 },
      startLatitude: 60.17,
      startLongitude: 24.94,
    };
    await writeFile(path.join(dir, 'raw', '10000000003.json'), JSON.stringify(run));
    // About 1.1 km due north at 1 Hz with a slight kink, so simplification keeps a middle point.
    const gps = Array.from({ length: 201 }, (_, i) => ({
      offsetS: i,
      heartRate: 130,
      lat: 60.17 + i * 0.00005,
      lng: 24.94 + (i === 100 ? 0.001 : 0),
    }));
    const fits = createFitStore(dir);
    await mkdir(path.dirname(fits.fileFor('10000000001' as never)), { recursive: true });
    await writeFile(fits.fileFor('10000000001' as never), makeFitFile(gps));
    await writeFile(fits.fileFor('10000000002' as never), makeFitFile(gps));
    await writeFile(fits.fileFor('10000000003' as never), makeFitFile(gps));

    const untrimmed = await rebuild(dir);
    expect(untrimmed.heatmapRoutes).toBe(2); // the outdoor ride and the run; the indoor ride has no route
    const full = await createHeatmapStore(dir).read();
    expect(full.trimM).toBe(0);
    expect(full.routes.map((r) => [r.id, r.date, r.sport, r.discipline])).toEqual([
      ['10000000001', '2026-11-01', 'cycling', 'cycling'],
      ['10000000003', '2026-11-01', 'running', 'running'],
    ]);
    const fullPoints = full.routes[0]!.points;
    expect(fullPoints[0]).toEqual([24.94, 60.17]);

    await createSettingsStore(dir).writeApp({ schemaVersion: 1, privacyTrimM: 200 });
    await rebuild(dir);
    const trimmed = await createHeatmapStore(dir).read();
    expect(trimmed.trimM).toBe(200);
    const pts = trimmed.routes[0]!.points;
    expect(haversineM(fullPoints[0]!, pts[0]!)).toBeCloseTo(200, -1);
    expect(haversineM(fullPoints.at(-1)!, pts.at(-1)!)).toBeCloseTo(200, -1);
  });
});
