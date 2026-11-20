import { activitySummarySchema } from '@app/shared';
import { describe, expect, it } from 'vitest';
import type { FitSample } from '../src/fit/parseFit.js';
import { joinRecordings, mergeSummaries } from '../src/rebuild/mergeRides.js';
import { summaryFromRaw } from '../src/rebuild/summaryFromRaw.js';

const ride = (id: number, startGmt: string, fields: Record<string, unknown> = {}) =>
  summaryFromRaw({
    activityId: id,
    activityName: `Ride ${id}`,
    startTimeLocal: startGmt.replace('07:', '09:').replace('08:', '10:'),
    startTimeGMT: startGmt,
    activityType: { typeKey: 'cycling', typeId: 2, parentTypeId: 17 },
    sportTypeId: 2,
    startLatitude: 60.17,
    ...fields,
  });

const sample = (t: number, distance: number | null, power: number | null = 200): FitSample => ({
  t,
  power,
  hr: 140,
  cadence: 90,
  speed: 8,
  altitude: 20,
  distance,
  lat: 60.17,
  lng: 24.94,
});

describe('mergeSummaries', () => {
  const first = ride(11, '2026-11-01 07:00:00', {
    duration: 3600,
    movingDuration: 3500,
    distance: 30_000,
    elevationGain: 200,
    averageSpeed: 8.57,
    maxSpeed: 14,
    averageHR: 140,
    maxHR: 170,
    avgPower: 200,
    maxPower: 600,
    calories: 900,
    bmrCalories: 100,
  });
  const second = ride(12, '2026-11-01 08:20:00', {
    duration: 1800,
    movingDuration: 1500,
    distance: 12_000,
    elevationGain: 100,
    averageSpeed: 8,
    maxSpeed: 16,
    averageHR: 150,
    maxHR: 165,
    avgPower: 250,
    maxPower: 500,
    calories: 500,
    bmrCalories: 50,
  });

  it('keeps the first recording’s identity and adds up the totals', () => {
    const merged = mergeSummaries([first, second]);
    expect(activitySummarySchema.parse(merged)).toEqual(merged);
    expect(merged).toMatchObject({
      id: '11',
      name: 'Ride 11',
      startTimeUtc: '2026-11-01T07:00:00.000Z',
      date: '2026-11-01',
      durationS: 5400,
      movingDurationS: 5000,
      distanceM: 42_000,
      elevationGainM: 300,
      maxSpeedMps: 16,
      maxHr: 170,
      maxPower: 600,
      activeCalories: 1250,
      hasPower: true,
    });
  });

  it('weights averages by riding time and derives speed from the totals', () => {
    const merged = mergeSummaries([first, second]);
    expect(merged.avgHr).toBe(143); // (140 × 3500 + 150 × 1500) / 5000
    expect(merged.avgPower).toBe(215);
    expect(merged.avgSpeedMps).toBe(8.4); // 42 km in 5000 s
  });

  it('places each recording after the first one’s start', () => {
    expect(mergeSummaries([first, second]).mergedFrom).toEqual([
      { id: '11', startS: 0, durationS: 3600 },
      { id: '12', startS: 4800, durationS: 1800 },
    ]);
  });

  it('leaves a total empty when a recording lacks it', () => {
    const withoutElevation = ride(13, '2026-11-01 08:30:00', { duration: 600 });
    const merged = mergeSummaries([first, withoutElevation]);
    expect(merged.elevationGainM).toBeNull();
    expect(merged.distanceM).toBeNull();
    // Averages use the recordings that have a value.
    expect(merged.avgHr).toBe(140);
  });

  it('needs two recordings', () => {
    expect(() => mergeSummaries([first])).toThrow();
  });
});

describe('joinRecordings', () => {
  it('continues the distance of a later recording from where the earlier one ended', () => {
    const joined = joinRecordings([
      { samples: [sample(100, 0), sample(101, 8), sample(102, null), sample(103, 16)], laps: [] },
      { samples: [sample(500, 0), sample(501, 8)], laps: [] },
    ]);
    expect(joined.samples.map((s) => [s.t, s.distance])).toEqual([
      [100, 0],
      [101, 8],
      [102, null],
      [103, 16],
      [500, 16],
      [501, 24],
    ]);
  });

  it('keeps every recording’s laps and leaves other channels as recorded', () => {
    const joined = joinRecordings([
      { samples: [sample(100, 0, 180)], laps: [{ t: 100, elapsedS: 1, trigger: 'sessionEnd' }] },
      { samples: [sample(500, 0, 220)], laps: [{ t: 500, elapsedS: 1, trigger: 'sessionEnd' }] },
    ]);
    expect(joined.laps.map((lap) => lap.t)).toEqual([100, 500]);
    expect(joined.samples.map((s) => s.power)).toEqual([180, 220]);
  });
});
