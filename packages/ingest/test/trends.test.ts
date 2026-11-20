import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MEAN_MAX_DURATIONS_S } from '@app/metrics';
import { ACTIVITY_SCHEMA_VERSION, createTrendsStore, type ActivitySummary } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { rebuild } from '../src/rebuild/rebuild.js';
import { buildTrends } from '../src/rebuild/trends.js';
import { useTempDir } from './helpers.js';

function summary(id: string, date: string, o: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id,
    name: `Ride ${id}`,
    sport: 'cycling',
    isCycling: true,
    isRunning: false,
    isIndoor: false,
    startTimeLocal: `${date}T08:00:00`,
    startTimeUtc: `${date}T06:00:00.000Z`,
    date,
    durationS: 4000,
    movingDurationS: 3600,
    distanceM: 30000,
    elevationGainM: 200,
    avgSpeedMps: 8,
    maxSpeedMps: 14,
    avgHr: 150,
    maxHr: 170,
    avgCadence: 85,
    maxCadence: 110,
    avgPower: null,
    maxPower: null,
    activeCalories: 600,
    hasPower: false,
    metrics: null,
    meanMaxPower: null,
    hrLoad: null,
    load: null,
    zones: { power: null, hr: null },
    records: null,
    climbs: null,
    hrPeak5s: null,
    lthrEstimate: null,
    decoupling: null,
    workoutType: null,
    mergedFrom: null,
    ...o,
  };
}

const powered = (id: string, date: string, np: number, best5: number, best20: number) =>
  summary(id, date, {
    isIndoor: true,
    hasPower: true,
    metrics: { np, ridingTimeS: 3600, ftpUsed: null, intensityFactor: null, tss: null },
    meanMaxPower: MEAN_MAX_DURATIONS_S.map((d) => (d <= 300 ? best5 : d <= 1200 ? best20 : null)),
  });

describe('buildTrends', () => {
  it('builds months, years and markers, applying the earliest weight to earlier rides', () => {
    const t = buildTrends(
      [
        summary('1', '2026-09-10'),
        summary('2', '2026-10-02', { isCycling: false, sport: 'strength_training' }),
        powered('3', '2026-10-27', 180, 250, 210),
        powered('4', '2026-11-05', 190, 260, 215),
      ],
      {
        ftpHistory: [{ from: '2026-10-27', watts: 199, source: 'manual' }],
        weightHistory: [{ from: '2026-11-04', kg: 85 }],
        today: '2026-11-06',
        generatedAt: '2026-11-06T00:00:00.000Z',
      },
    );
    expect(t.months.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(t.months[1]).toMatchObject({ rides: 1, strengthSessions: 1, indoorS: 3600 });
    expect(t.years).toHaveLength(1);
    expect(t.years[0]!.toDate).toEqual({ hours: 3, distanceKm: 30, elevationM: 200, rides: 3, gym: 1 }); // the strength session counts as a gym workout; the two indoor rides add no distance or elevation
    expect(t.ftp.manual).toHaveLength(1);
    expect(t.ftp.eftp.at(-1)).toEqual({ date: '2026-11-06', watts: 204 });
    expect(t.rides.map((r) => [r.id, r.ef])).toEqual([
      ['3', 1.2],
      ['4', 1.267],
    ]);
    // Week ending 1.11 is before the first weight entry (4.11): the earliest weight is back-applied.
    expect(t.vo2max.map((p) => [p.date, p.best5minW, p.kg, p.activityId])).toEqual([
      ['2026-11-01', 250, 85, '3'],
      ['2026-11-06', 260, 85, '4'],
    ]);
    expect(t.vo2max[0]!.vo2max).toBeCloseTo((1.8 * 250 * 6.12) / 85 + 7, 1);
  });
});

describe('rebuild trends.json', () => {
  const tempDir = useTempDir();

  it('lists aerobic decoupling per ride, oldest first', () => {
    const t = buildTrends(
      [
        summary('b', '2026-11-05', { decoupling: { percent: 6.2, basis: 'speed', durationS: 5000 } }),
        summary('a', '2026-11-01', { decoupling: { percent: 3.1, basis: 'power', durationS: 4000 } }),
        summary('c', '2026-11-03'),
      ],
      { ftpHistory: [], weightHistory: [], today: '2026-11-10', generatedAt: '2026-11-10T00:00:00.000Z' },
    );
    expect(t.decoupling).toEqual([
      { id: 'a', date: '2026-11-01', name: 'Ride a', percent: 3.1, basis: 'power' },
      { id: 'b', date: '2026-11-05', name: 'Ride b', percent: 6.2, basis: 'speed' },
    ]);
  });

  it('writes derived/trends.json', async () => {
    const dir = tempDir();
    const [ride] = JSON.parse(
      await readFile(new URL('./fixtures/activity-list.json', import.meta.url), 'utf8'),
    ) as unknown[];
    await mkdir(path.join(dir, 'raw'), { recursive: true });
    await writeFile(path.join(dir, 'raw', '10000000001.json'), JSON.stringify(ride));
    await rebuild(dir, () => {}, { today: '2026-11-06' });
    const t = await createTrendsStore(dir).read();
    expect(t.today).toBe('2026-11-06');
    expect(t.months.map((m) => m.month)).toEqual(['2026-11']);
    expect(t.months[0]!.rides).toBe(1);
    expect(t.rides).toEqual([]);
  });
});
