import type { CurvePoint } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { powerCurveCoachText, type PowerCurveCoach } from './coachText';

const TODAY = '2026-11-24';

const point = (durationS: number, watts: number, date: string, name?: string): CurvePoint => ({
  durationS,
  watts,
  date,
  activityId: `${durationS}-${date}`,
  ...(name ? { name } : {}),
});

const CURVE = [
  point(5, 960, '2026-10-05', 'Sprints'),
  point(60, 480, '2026-10-05', 'Sprints'),
  point(300, 320, '2026-10-12', 'Hill repeats'),
  point(1200, 272, '2026-11-01', 'FTP test'),
];

/** 80 kg from October on, no weight before. */
const kgFor = (date: string) => (date >= '2026-10-01' ? 80 : null);

const coach = (overrides: Partial<PowerCurveCoach> = {}): PowerCurveCoach => ({
  today: TODAY,
  primary: 'last90',
  compare: 'none',
  primaryCurve: CURVE,
  compareCurve: [],
  kgFor,
  rideCount: 12,
  model: { cp: 264, wPrimeJ: 18_460, rSquared: 0.998, durationsS: [120, 300, 600, 1200] },
  ftp: 265,
  kgToday: 80,
  vo2max: { date: '2026-11-23', vo2max: 49.27, best5minW: 320, kg: 80 },
  ...overrides,
});

describe('powerCurveCoachText', () => {
  it('writes the curve, rider profile, critical power and VO₂ max', () => {
    expect(powerCurveCoachText(coach())).toBe(
      [
        '## Power curve: Last 90 days, 2026-08-27 to 2026-11-24',
        '12 rides with power in range · Weight today 80.0 kg · FTP setting 265 W',
        "Best power by duration (W/kg uses the weight on the ride's date):",
        '- 5 s: 960 W · 12.00 W/kg (2026-10-05, Sprints)',
        '- 1 min: 480 W · 6.00 W/kg (2026-10-05, Sprints)',
        '- 5 min: 320 W · 4.00 W/kg (2026-10-12, Hill repeats)',
        '- 20 min: 272 W · 3.40 W/kg (2026-11-01, FTP test)',
        "Rider profile (Coggan's power profile, men's reference ranges; 0% = untrained, 100% = world class): Time trialist / climber",
        '- 5 s: 12.00 W/kg (960 W), 12%',
        '- 1 min: 6.00 W/kg (480 W), 6%',
        '- 5 min: 4.00 W/kg (320 W), 32%',
        '- FTP (95% of best 20 min): 3.23 W/kg (258 W), 30%',
        'Critical power (two-parameter model fitted to the 2 min, 5 min, 10 min and 20 min bests; an estimate, not a test): CP 264 W · 3.30 W/kg · W′ 18.5 kJ · Good fit (R² 0.998)',
        "VO₂ max (this app's estimate, not Garmin's: ACSM cycling equation on the best 5-min power of the previous 90 days): 49.3 ml/kg/min as of 2026-11-23, from 320 W at 80.0 kg",
      ].join('\n'),
    );
  });

  it('puts the comparison range beside each duration, also where only one range has an effort', () => {
    const text = powerCurveCoachText(
      coach({
        primary: 'last42',
        compare: 'year',
        compareCurve: [point(5, 990, '2026-03-01', 'Group ride'), point(7200, 180, '2026-05-10')],
      }),
    );
    const lines = text.split('\n');

    expect(lines[1]).toBe('Compared with: This year, 2026-01-01 to 2026-11-24');
    expect(lines).toContain(
      "Best power by duration, with This year beside it (W/kg uses the weight on the ride's date):",
    );
    // No weight before October, so the comparison's 5 s has no W/kg.
    expect(lines).toContain(
      '- 5 s: 960 W · 12.00 W/kg (2026-10-05, Sprints) | This year: 990 W (2026-03-01, Group ride)',
    );
    expect(lines).toContain('- 1 min: 480 W · 6.00 W/kg (2026-10-05, Sprints) | This year: no effort');
    expect(lines).toContain('- 2 h: no effort | This year: 180 W (2026-05-10)');
  });

  it('leaves out what is missing', () => {
    const text = powerCurveCoachText(
      coach({
        primary: 'all',
        primaryCurve: [point(300, 250, '2026-02-01')],
        kgFor: () => null,
        rideCount: 1,
        model: null,
        ftp: null,
        kgToday: null,
        vo2max: null,
      }),
    );

    expect(text).toBe(
      [
        '## Power curve: All time, up to 2026-11-24',
        '1 ride with power in range',
        "Best power by duration (W/kg uses the weight on the ride's date):",
        '- 5 min: 250 W (2026-02-01)',
      ].join('\n'),
    );
  });
});
