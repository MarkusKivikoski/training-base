import { streamSchema, type FtpEntry, type LthrEntry } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { decodeFit, FitNoRecordsError, FitParseError, parseFit } from '../src/fit/parseFit.js';
import { routeFromStream, simplifyRoute, type LngLat } from '../src/fit/simplifyRoute.js';
import { toStreams } from '../src/fit/toStreams.js';
import {
  chooseLoad,
  computeHrLoad,
  computePowerMetrics,
  computeRideRecords,
  computeZones,
} from '../src/rebuild/rebuild.js';
import { FIT_START, makeFitFile, type FitRec } from './helpers.js';

const indoorRide = (seconds: number, watts: (i: number) => number) =>
  makeFitFile(
    Array.from({ length: seconds }, (_, i) => ({ offsetS: i, power: watts(i), heartRate: 140, cadence: 90 })),
  );

describe('parseFit', () => {
  it('reads 1 Hz records with units converted', () => {
    const samples = parseFit(
      makeFitFile([
        {
          offsetS: 0,
          power: 200,
          heartRate: 130,
          cadence: 85,
          speed: 8.5,
          altitude: 21.4,
          distance: 0,
          lat: 60.17,
          lng: 24.94,
        },
        {
          offsetS: 1,
          power: 210,
          heartRate: 131,
          cadence: 86,
          speed: 8.6,
          altitude: 21.5,
          distance: 8.6,
          lat: 60.17001,
          lng: 24.94001,
        },
      ]),
    );
    expect(samples).toHaveLength(2);
    expect(samples[0]).toMatchObject({ t: FIT_START.getTime() / 1000, power: 200, hr: 130, cadence: 85 });
    expect(samples[0]!.speed).toBeCloseTo(8.5, 2);
    expect(samples[0]!.altitude).toBeCloseTo(21.4, 0);
    expect(samples[0]!.lat).toBeCloseTo(60.17, 5);
    expect(samples[0]!.lng).toBeCloseTo(24.94, 5);
    expect(samples[1]!.distance).toBeCloseTo(8.6, 2);
  });

  it('leaves channels the device did not record as null', () => {
    const [s] = parseFit(makeFitFile([{ offsetS: 0, heartRate: 120 }]));
    expect(s).toMatchObject({ power: null, cadence: null, lat: null, lng: null, hr: 120 });
  });

  it('rejects files that are not FIT or have no records', () => {
    const notFit = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(() => parseFit(notFit)).toThrow(FitParseError);
    expect(() => parseFit(notFit)).not.toThrow(FitNoRecordsError);
    expect(() => parseFit(makeFitFile([]))).toThrow(/no usable records/);
  });

  it('tells a valid file without records (a manual entry) apart from a broken one', () => {
    expect(() => parseFit(makeFitFile([]))).toThrow(FitNoRecordsError);
  });
});

describe('toStreams', () => {
  it('builds columnar per-second streams relative to the first record', () => {
    const stream = toStreams(
      parseFit(
        makeFitFile([
          { offsetS: 0, power: 100, heartRate: 120 },
          { offsetS: 1, power: 110, heartRate: 121 },
          { offsetS: 3, power: 120 },
        ]),
      ),
    );
    expect(streamSchema.parse(stream)).toEqual(stream);
    expect(stream.time).toEqual([0, 1, 3]); // No gap filling in stored streams.
    expect(stream.power).toEqual([100, 110, 120]);
    expect(stream.hr).toEqual([120, 121, null]);
    expect(stream.lat).toBeNull();
    expect(stream.cadence).toBeNull();
  });

  it('collapses records in the same second, keeping the last', () => {
    const stream = toStreams([
      { t: 100, power: 1, hr: null, cadence: null, speed: null, altitude: null, distance: null, lat: null, lng: null },
      { t: 100, power: 2, hr: null, cadence: null, speed: null, altitude: null, distance: null, lat: null, lng: null },
      { t: 99, power: 0, hr: null, cadence: null, speed: null, altitude: null, distance: null, lat: null, lng: null },
    ]);
    expect(stream.time).toEqual([0, 1]);
    expect(stream.power).toEqual([0, 2]);
  });
});

describe('computePowerMetrics', () => {
  const ftp: FtpEntry[] = [{ from: '2026-10-27', watts: 200, source: 'manual' }];

  it('computes NP, IF, TSS and mean-max from a real FIT file', () => {
    const stream = toStreams(parseFit(indoorRide(3600, () => 200)));
    const r = computePowerMetrics(stream, '2026-11-01', ftp);
    expect(r.hasPower).toBe(true);
    expect(r.metrics).toEqual({ np: 200, ridingTimeS: 3600, ftpUsed: 200, intensityFactor: 1, tss: 100 });
    expect(r.meanMaxPower?.slice(0, 12).every((w) => w === 200)).toBe(true);
    expect(r.meanMaxPower?.slice(12)).toEqual([null, null]); // 5400 s and 7200 s
  });

  it('leaves IF and TSS empty before the first FTP entry (no back-dating)', () => {
    const stream = toStreams(parseFit(indoorRide(600, () => 180)));
    const r = computePowerMetrics(stream, '2026-10-25', ftp);
    expect(r.metrics).toMatchObject({ np: 180, ftpUsed: null, intensityFactor: null, tss: null });
    expect(r.meanMaxPower?.[0]).toBe(180);
  });

  it('reports no power for rides without a power meter', () => {
    const stream = toStreams(
      parseFit(
        makeFitFile([
          { offsetS: 0, heartRate: 120 },
          { offsetS: 1, heartRate: 121 },
        ]),
      ),
    );
    expect(computePowerMetrics(stream, '2026-11-01', ftp)).toEqual({
      metrics: null,
      meanMaxPower: null,
      hasPower: false,
    });
  });

  it('treats an all-zero power channel as no power', () => {
    const stream = toStreams(parseFit(indoorRide(60, () => 0)));
    expect(computePowerMetrics(stream, '2026-11-01', ftp).hasPower).toBe(false);
  });

  it('applies the gap rules: a 77 s pause splits the ride', () => {
    const recs: FitRec[] = [];
    for (let i = 0; i < 600; i++) recs.push({ offsetS: i, power: 250 });
    for (let i = 0; i < 600; i++) recs.push({ offsetS: 677 + i, power: 150 });
    const r = computePowerMetrics(toStreams(parseFit(makeFitFile(recs))), '2026-11-01', ftp);
    expect(r.metrics?.ridingTimeS).toBe(1200);
    // The best 10 minutes is the first half only, not a window across the pause.
    expect(r.meanMaxPower?.[8]).toBe(250);
    expect(r.meanMaxPower?.[9]).toBeNull(); // 1200 s doesn't fit in either segment
  });
});

describe('simplifyRoute', () => {
  it('reduces a straight line to its endpoints', () => {
    const line: LngLat[] = Array.from({ length: 100 }, (_, i) => [24.9 + i * 0.0001, 60.17]);
    // Output is rounded to 6 decimals.
    expect(simplifyRoute(line)).toEqual([
      [24.9, 60.17],
      [24.9099, 60.17],
    ]);
  });

  it('keeps the corner of an L-shape', () => {
    const l: LngLat[] = [
      ...Array.from({ length: 50 }, (_, i): LngLat => [24.9 + i * 0.0001, 60.17]),
      ...Array.from({ length: 50 }, (_, i): LngLat => [24.9049, 60.17 + (i + 1) * 0.0001]),
    ];
    const s = simplifyRoute(l);
    expect(s).toHaveLength(3);
    expect(s[1]).toEqual([24.9049, 60.17]);
  });

  it('handles tiny inputs and drops sub-epsilon jitter', () => {
    expect(simplifyRoute([[24.9, 60.17]])).toEqual([[24.9, 60.17]]);
    const jitter: LngLat[] = [
      [24.9, 60.17],
      [24.90005, 60.170001],
      [24.9001, 60.17],
    ];
    expect(simplifyRoute(jitter, 5)).toHaveLength(2);
  });

  it('builds [lng, lat] pairs from stream channels, skipping missing positions', () => {
    expect(routeFromStream([60.1, null, 60.2], [24.1, 24.15, 24.2])).toEqual([
      [24.1, 60.1],
      [24.2, 60.2],
    ]);
    expect(routeFromStream(null, null)).toEqual([]);
  });
});

describe('heart-rate load and load choice', () => {
  const lthr: LthrEntry[] = [{ from: '2026-10-27', bpm: 155, source: 'estimated' }];
  const hrOnly = (seconds: number, bpm: number) =>
    toStreams(parseFit(makeFitFile(Array.from({ length: seconds }, (_, i) => ({ offsetS: i, heartRate: bpm })))));

  it('computes HR TSS at the LTHR in effect, never before the first entry', () => {
    expect(computeHrLoad(hrOnly(3600, 155), '2026-11-01', lthr)).toEqual({ tss: 100, lthrUsed: 155 });
    expect(computeHrLoad(hrOnly(3600, 155), '2026-10-26', lthr)).toBeNull();
  });

  it('prefers power TSS, falls back to HR TSS, and ignores non-cycling activities', () => {
    const metrics = { np: 200, ridingTimeS: 3600, ftpUsed: 200, intensityFactor: 1, tss: 100 };
    const hrLoad = { tss: 80, lthrUsed: 155 };
    expect(chooseLoad({ isCycling: true, metrics, hrLoad })).toEqual({ tss: 100, source: 'power' });
    expect(chooseLoad({ isCycling: true, metrics: { ...metrics, tss: null }, hrLoad })).toEqual({
      tss: 80,
      source: 'hr',
    });
    expect(chooseLoad({ isCycling: true, metrics: null, hrLoad: null })).toBeNull();
    expect(chooseLoad({ isCycling: false, metrics: null, hrLoad })).toBeNull();
  });
});

describe('computeZones', () => {
  const ftp: FtpEntry[] = [{ from: '2026-10-27', watts: 200, source: 'manual' }];
  const lthr: LthrEntry[] = [{ from: '2026-10-27', bpm: 155, source: 'estimated' }];
  // 10 min at 100 W (Z1), 10 min at 200 W (Z4, 100% FTP) with HR 150 (Z4, 97% LTHR).
  const ride = () =>
    toStreams(
      parseFit(
        makeFitFile(
          Array.from({ length: 1200 }, (_, i) =>
            i < 600 ? { offsetS: i, power: 100, heartRate: 120 } : { offsetS: i, power: 200, heartRate: 150 },
          ),
        ),
      ),
    );

  it('counts seconds per power and HR zone with the thresholds in effect', () => {
    const z = computeZones(ride(), { date: '2026-11-01', isCycling: true }, ftp, lthr);
    expect(z.power).toEqual({
      threshold: 200,
      thresholdFrom: '2026-10-27',
      backApplied: false,
      seconds: [600, 0, 0, 600, 0, 0, 0],
    });
    // 120 bpm is 77% of LTHR -> Z2; 150 bpm -> Z4.
    expect(z.hr).toEqual({
      threshold: 155,
      thresholdFrom: '2026-10-27',
      backApplied: false,
      seconds: [0, 600, 0, 600, 0],
    });
  });

  it('applies the earliest threshold to earlier rides, marked as back-applied', () => {
    const z = computeZones(ride(), { date: '2025-06-01', isCycling: true }, ftp, lthr);
    expect(z.power?.backApplied).toBe(true);
    expect(z.hr?.backApplied).toBe(true);
    expect(z.hr?.threshold).toBe(155);
  });

  it('gives no zones for non-cycling activities, missing channels or missing thresholds', () => {
    expect(computeZones(ride(), { date: '2026-11-01', isCycling: false }, ftp, lthr)).toEqual({
      power: null,
      hr: null,
    });
    const hrOnly = toStreams(
      parseFit(
        makeFitFile([
          { offsetS: 0, heartRate: 140 },
          { offsetS: 1, heartRate: 141 },
        ]),
      ),
    );
    expect(computeZones(hrOnly, { date: '2026-11-01', isCycling: true }, ftp, lthr).power).toBeNull();
    expect(computeZones(ride(), { date: '2026-11-01', isCycling: true }, [], [])).toEqual({ power: null, hr: null });
  });
});

describe('computeRideRecords', () => {
  it('takes record distances from the FIT distance and a sustained max speed', () => {
    // 1200 s at 10 m/s with one 50 m/s speed spike: 12 km covered.
    const recs = Array.from({ length: 1201 }, (_, i) => ({ offsetS: i, speed: i === 600 ? 50 : 10, distance: i * 10 }));
    const r = computeRideRecords(toStreams(parseFit(makeFitFile(recs))), { isCycling: true, isRunning: false })!;
    expect(r.distanceBestsS.slice(0, 4)).toEqual([100, 500, 1000, null]); // 1, 5, 10, 25 km
    expect(r.maxSpeedMps).toBeCloseTo(10, 6); // the 50 m/s spike is dropped as implausible
    expect(r.distanceM).toBe(12000);
    expect(r.movingS).toBe(1200);
    const other = { isCycling: false, isRunning: false };
    expect(computeRideRecords(toStreams(parseFit(makeFitFile(recs))), other)).toBeNull();
  });

  it('uses the run distances and the lower glitch limit for runs', () => {
    // 1500 s at 4 m/s with one 12 m/s speed spike (possible on a bike, not on foot): 6 km covered.
    const recs = Array.from({ length: 1501 }, (_, i) => ({ offsetS: i, speed: i === 600 ? 12 : 4, distance: i * 4 }));
    const r = computeRideRecords(toStreams(parseFit(makeFitFile(recs))), { isCycling: false, isRunning: true })!;
    expect(r.distanceBestsS).toEqual([250, 750, 1250, null, null, null, null]); // 1, 3, 5 km; too short for 10 km+
    expect(r.maxSpeedMps).toBeCloseTo(4, 6);
    expect(r.distanceM).toBe(6000);
  });
});

describe('device laps', () => {
  it('stores laps relative to the first record', () => {
    const recs = Array.from({ length: 600 }, (_, i) => ({ offsetS: i, power: 150 }));
    const bytes = makeFitFile(recs, [
      { offsetS: 0, elapsedS: 300, trigger: 'manual' },
      { offsetS: 300, elapsedS: 300, trigger: 'sessionEnd' },
    ]);
    const { samples, laps } = decodeFit(bytes);
    const stream = toStreams(samples, laps);
    expect(stream.laps).toEqual([
      { startS: 0, endS: 300, trigger: 'manual' },
      { startS: 300, endS: 600, trigger: 'sessionEnd' },
    ]);
    expect(toStreams(samples).laps).toBeNull();
  });
});
