import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { coachRidesText, coachRideText, formBefore, type CoachRide } from './coachText';
import type { RangeRow } from '@/shared/lib/rangeRows';

const MEAN_MAX = [900, 720, 600, 550, 500, 410, 360, 312, 290, 268, 250, 225, null, null];

const activity = (overrides: Partial<Activity> = {}) =>
  ({
    name: 'Morning loop',
    isCycling: true,
    hasPower: true,
    sport: 'cycling',
    isIndoor: false,
    startTimeLocal: '2026-11-10T07:30:00',
    durationS: 8045,
    movingDurationS: 7900,
    distanceM: 68400,
    elevationGainM: 812,
    avgSpeedMps: 8.5,
    avgPower: 198,
    maxPower: 784,
    avgHr: 148,
    maxHr: 176,
    avgCadence: 87,
    metrics: { np: 221, ridingTimeS: 7900, ftpUsed: 270, intensityFactor: 0.8185, tss: 151 },
    load: { tss: 151, source: 'power' },
    meanMaxPower: MEAN_MAX,
    decoupling: null,
    zones: { power: null, hr: null },
    ...overrides,
  }) as Activity;

const ride = (overrides: Partial<CoachRide> = {}): CoachRide => ({
  activity: activity(),
  laps: [],
  rpe: null,
  note: null,
  weightKg: null,
  form: null,
  minutes: null,
  ...overrides,
});

const lap = (overrides: Partial<RangeRow> = {}): RangeRow => ({
  startS: 0,
  endS: 600,
  durationS: 600,
  distanceM: 5000,
  avgPower: 250,
  maxPower: 400,
  np: 260,
  avgHr: 150,
  maxHr: 160,
  avgCadence: 90,
  avgSpeed: 8.33,
  ...overrides,
});

describe('coachRideText', () => {
  it('writes a full ride as Markdown', () => {
    const text = coachRideText(
      ride({ rpe: 7, note: 'legs heavy', weightKg: 74, form: { ctl: 72, atl: 85, tsb: -13 }, laps: [lap(), lap()] }),
    );
    expect(text).toBe(
      [
        '## 2026-11-10 07:30 · Morning loop',
        'Sport: Road / outdoor cycling',
        'Duration 2:14:05 · Moving 2:11:40 · Distance 68.4 km · Elevation 812 m · Avg speed 30.6 km/h',
        'Power: avg 198 W · max 784 W',
        'Load: NP 221 W · IF 0.82 · TSS 151 · FTP used 270 W',
        'HR: avg 148 bpm · max 176 bpm',
        'Cadence: avg 87 rpm',
        'Best power: 5 s 720 W · 1 min 410 W · 5 min 312 W · 20 min 268 W · 1 h 225 W',
        'Weight 74.0 kg · NP 2.99 W/kg',
        'Form before ride: CTL 72.0 · ATL 85.0 · TSB -13.0',
        'Effort rating: 7/10',
        'Note: "legs heavy"',
        'Laps:',
        '- Lap 1: 10:00 · 5.0 km · avg 250 W · NP 260 W · HR 150 bpm · cad 90 rpm · 30.0 km/h',
        '- Lap 2: 10:00 · 5.0 km · avg 250 W · NP 260 W · HR 150 bpm · cad 90 rpm · 30.0 km/h',
      ].join('\n'),
    );
  });

  it('leaves out everything that is missing, including an empty rating and note', () => {
    const text = coachRideText(
      ride({
        activity: activity({
          sport: 'indoor_cycling',
          hasPower: false,
          isIndoor: true,
          movingDurationS: null,
          distanceM: 0,
          avgSpeedMps: null,
          avgPower: null,
          maxPower: null,
          avgCadence: null,
          metrics: null,
          load: { tss: 40, source: 'hr' },
          meanMaxPower: null,
        }),
      }),
    );
    expect(text).toBe(
      [
        '## 2026-11-10 07:30 · Morning loop',
        'Sport: Indoor cycling',
        'No power meter, HR-based load',
        'Duration 2:14:05',
        'Load: HR TSS 40',
        'HR: avg 148 bpm · max 176 bpm',
      ].join('\n'),
    );
    expect(text).not.toMatch(/Effort|Note|Laps|—/);
  });
});

describe('coachRideText without a power meter', () => {
  it('says so, and whether there is an HR-based load', () => {
    const noPower = { hasPower: false, avgPower: null, maxPower: null, metrics: null, meanMaxPower: null };
    const withHrLoad = coachRideText(ride({ activity: activity({ ...noPower, load: { tss: 40, source: 'hr' } }) }));
    const withoutLoad = coachRideText(ride({ activity: activity({ ...noPower, load: null }) }));
    expect(withHrLoad).toContain('\nNo power meter, HR-based load\n');
    expect(withoutLoad).toContain('\nNo power meter, no load estimate (no HR-based TSS)\n');
  });

  it('never mentions a power meter for other sports', () => {
    const run = activity({ isCycling: false, hasPower: false, sport: 'running', metrics: null });
    expect(coachRideText(ride({ activity: run }))).not.toContain('power meter');
  });
});

describe('coachRideText zones and minutes', () => {
  it('adds time in zones and, when given, per-minute data at the end', () => {
    const zones = {
      power: { threshold: 200, thresholdFrom: '2026-10-01', backApplied: false, seconds: [60, 0, 0, 0, 0, 0, 0] },
      hr: null,
    };
    const text = coachRideText(
      ride({
        activity: activity({ zones }),
        minutes: { channels: ['power'], rows: [{ minute: 0, averages: [180] }] },
      }),
    );
    expect(text).toContain('Time in power zones, FTP (200 W):\n- Z1 Active recovery (0–111 W): 1:00 (100%)');
    expect(text.endsWith('minute,power_w\n0,180')).toBe(true);
  });
});

describe('coachRidesText', () => {
  it('returns a single ride without a header', () => {
    expect(coachRidesText([ride()])).toBe(coachRideText(ride()));
  });

  it('lists several rides oldest first under a count', () => {
    const newer = ride({ activity: activity({ name: 'Newer', startTimeLocal: '2026-11-10T07:30:00' }) });
    const older = ride({ activity: activity({ name: 'Older', startTimeLocal: '2026-11-08T07:30:00' }) });
    const text = coachRidesText([newer, older]);
    expect(text.startsWith('# 2 activities\n\n## 2026-11-08 07:30 · Older')).toBe(true);
    expect(text.indexOf('Older')).toBeLessThan(text.indexOf('Newer'));
  });
});

describe('formBefore', () => {
  const days = [
    { date: '2026-11-08', ctl: 70, atl: 80 },
    { date: '2026-11-09', ctl: 72, atl: 85 },
    { date: '2026-11-10', ctl: 74, atl: 95 },
  ];

  it("uses the previous day's load", () => {
    expect(formBefore(days, '2026-11-10')).toEqual({ ctl: 72, atl: 85, tsb: -13 });
  });

  it('is null before the load history starts', () => {
    expect(formBefore(days, '2026-11-08')).toBeNull();
  });
});
