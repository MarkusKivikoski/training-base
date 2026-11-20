import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { monthSummaryText, weekSummaryText } from './loadSummaryText';

type ZoneSetInput = { threshold?: number; from?: string; backApplied?: boolean; seconds: number[] };

const zoneSet = ({ threshold = 200, from = '2026-10-01', backApplied = false, seconds }: ZoneSetInput) => ({
  threshold,
  thresholdFrom: from,
  backApplied,
  seconds,
});

const ride = (overrides: Partial<Activity> = {}) =>
  ({
    name: 'Ride',
    date: '2026-11-03',
    sport: 'cycling',
    isCycling: true,
    isIndoor: false,
    hasPower: true,
    durationS: 3600,
    movingDurationS: 3600,
    distanceM: 30000,
    elevationGainM: 200,
    load: { tss: 60, source: 'power' },
    zones: {
      power: zoneSet({ seconds: [900, 1800, 900, 0, 0, 0, 0] }),
      hr: zoneSet({ threshold: 155, seconds: [600, 2400, 600, 0, 0] }),
    },
    ...overrides,
  }) as Activity;

const other = (sport: string, durationS: number) =>
  ({ sport, durationS, isCycling: false, zones: { power: null, hr: null } }) as unknown as Activity;

const hrOnlyRide = (overrides: Partial<Activity> = {}) =>
  ride({
    hasPower: false,
    load: null,
    zones: {
      power: null,
      hr: zoneSet({ threshold: 155, from: '2026-10-27', backApplied: true, seconds: [0, 1800, 1800, 0, 0] }),
    },
    ...overrides,
  });

describe('weekSummaryText', () => {
  it('splits TSS by source, shows power coverage, thresholds and other activities', () => {
    const text = weekSummaryText('2026-11-02', '2026-11-08', [
      ride(),
      hrOnlyRide({
        name: 'Gravel',
        date: '2026-11-07',
        durationS: 7200,
        movingDurationS: 7200,
        load: { tss: 106, source: 'hr' },
      }),
      other('strength_training', 2700),
      other('strength_training', 1800),
      other('walking', 3600),
    ]);
    expect(text).toBe(
      [
        '## Training load, week 2026-11-02 to 2026-11-08',
        'Riding: 3.0 h moving (2 rides) · Outdoor 60 km',
        'Longest ride: 2.0 h (2026-11-07, Gravel)',
        'Power data: 1 of 2 rides (1.0 h of 3.0 h)',
        'TSS 166 from 2 of 2 rides: power 60 (1 ride) · HR-based 106 (1 ride)',
        'Time in Z1–Z2 (hours are time with that data, not moving time):',
        '- Power: 75% of 1.0 h (FTP 200 W)',
        '- HR: 67% of 2.0 h (LTHR 155 bpm; the LTHR set 2026-10-27 is applied back to earlier rides)',
        'Other activities (not in the riding totals):',
        '- Strength training: 2 sessions, 1.3 h',
        '- Walking: 1 session, 1.0 h',
      ].join('\n'),
    );
  });

  it('calls out rides without TSS instead of counting them as zero', () => {
    const text = weekSummaryText('2026-10-05', '2026-10-11', [ride(), hrOnlyRide(), hrOnlyRide()]);
    expect(text).toContain(
      'TSS 60 from 1 of 3 rides: power 60 (1 ride). No TSS for 2 rides (no FTP or LTHR in effect for them: FTP and LTHR are never applied to rides before they were set), so the real load was higher',
    );
  });

  it('says n/a when no ride has TSS', () => {
    expect(weekSummaryText('2026-10-05', '2026-10-11', [hrOnlyRide()])).toContain(
      'TSS: n/a (no ride has power TSS or heart-rate TSS)',
    );
  });

  it('shows a threshold range when it changed', () => {
    const text = weekSummaryText('2026-11-02', '2026-11-08', [
      ride(),
      ride({ zones: { power: zoneSet({ threshold: 210, seconds: [3600, 0, 0, 0, 0, 0, 0] }), hr: null } }),
    ]);
    expect(text).toContain('(FTP 200–210 W)');
  });

  it('handles weeks without rides', () => {
    expect(weekSummaryText('2026-11-02', '2026-11-08', [])).toBe(
      '## Training load, week 2026-11-02 to 2026-11-08\nNo activities.',
    );
    expect(weekSummaryText('2026-11-02', '2026-11-08', [other('walking', 1800)])).toBe(
      [
        '## Training load, week 2026-11-02 to 2026-11-08',
        'No rides.',
        'Other activities (not in the riding totals):',
        '- Walking: 1 session, 0.5 h',
      ].join('\n'),
    );
  });
});

describe('monthSummaryText', () => {
  it('adds the weekly average over the days counted so far, and a line per week', () => {
    const text = monthSummaryText(
      '2026-11',
      [
        { monday: '2026-10-26', activities: [ride({ date: '2026-11-01' })] },
        { monday: '2026-11-02', activities: [ride(), hrOnlyRide()] },
      ],
      '2026-11-14',
    );
    // 3 h over 14 days = 2 weeks.
    expect(text).toContain('Riding: 3.0 h moving (3 rides) · Outdoor 90 km · Avg 1.5 h/week');
    expect(text.split('\n').slice(-3)).toEqual([
      'By week (days in this month only):',
      '- Week of 2026-10-26: 1.0 h · TSS 60 (1 of 1 ride) · Z1–Z2 power 75%, HR 83%',
      '- Week of 2026-11-02: 2.0 h · TSS 60 (1 of 2 rides) · Z1–Z2 power 75%, HR 67%',
    ]);
  });

  it('averages a past month over all its days', () => {
    const text = monthSummaryText(
      '2026-10',
      [{ monday: '2026-10-05', activities: [ride({ date: '2026-10-05' })] }],
      '2026-11-14',
    );
    // 1 h over 31 days.
    expect(text).toContain('Avg 0.2 h/week');
  });
});
