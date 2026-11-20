import { describe, expect, it } from 'vitest';
import {
  cumulativeByYear,
  efficiencyFactor,
  eftpSeries,
  MEAN_MAX_DURATIONS_S,
  monthlyVolume,
  rideTimeS,
  vo2maxEstimate,
  vo2maxSeries,
  zonePeriods,
  type TrendInput,
} from '../src/index.js';

const act = (date: string, hours: number, o: Partial<TrendInput> = {}): TrendInput => ({
  date,
  durationS: hours * 3600,
  movingDurationS: hours * 3600,
  distanceM: hours * 25_000,
  elevationGainM: 100,
  isIndoor: false,
  isCycling: true,
  sport: 'cycling',
  ...o,
});

describe('rideTimeS', () => {
  it('uses moving time, falling back to elapsed duration', () => {
    expect(rideTimeS({ durationS: 4000, movingDurationS: 3600 })).toBe(3600);
    expect(rideTimeS({ durationS: 4000, movingDurationS: null })).toBe(4000);
    expect(rideTimeS({ durationS: 4000 })).toBe(4000);
    expect(rideTimeS({ durationS: 351, movingDurationS: 0 })).toBe(351);
  });
});

describe('monthlyVolume', () => {
  it('buckets by month with empty months, splits indoor/outdoor and counts strength', () => {
    const months = monthlyVolume(
      [
        act('2025-12-31', 1, { isIndoor: true }),
        act('2026-02-10', 2, { movingDurationS: 5400 }),
        act('2026-02-11', 1, { isCycling: false, sport: 'strength_training' }),
        act('2026-02-12', 1, { isCycling: false, sport: 'running' }),
        act('2026-04-01', 1), // outside the range
      ],
      { from: '2025-12-01', to: '2026-03-31' },
    );
    expect(months.map((m) => m.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
    expect(months[0]).toMatchObject({ indoorS: 3600, outdoorS: 0, rides: 1, strengthSessions: 0 });
    expect(months[1]).toMatchObject({ indoorS: 0, outdoorS: 0, rides: 0, strengthSessions: 0 });
    expect(months[2]).toMatchObject({
      outdoorS: 5400,
      rides: 1,
      distanceM: 50_000,
      elevationGainM: 100,
      strengthSessions: 1,
    });
    expect(months[3]!.rides).toBe(0);
  });

  it('counts distance and elevation from outdoor rides only', () => {
    const [month] = monthlyVolume([act('2026-02-10', 1), act('2026-02-11', 1, { isIndoor: true })], {
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(month).toMatchObject({ distanceM: 25_000, elevationGainM: 100, rides: 2, indoorS: 3600, outdoorS: 3600 });
  });
});

describe('cumulativeByYear', () => {
  it('accumulates weekly hours per year, stops the current year at today, and totals to date', () => {
    const years = cumulativeByYear(
      [
        act('2025-01-03', 1), // week 1
        act('2025-01-10', 2), // week 2
        act('2025-12-31', 1), // day 365 -> week 53
        act('2026-01-02', 3),
        act('2026-01-20', 1), // after today
        act('2026-01-05', 1, { isCycling: false, sport: 'strength_training' }),
      ],
      { today: '2026-01-15' },
    );
    expect(years.map((y) => y.year)).toEqual([2025, 2026]);
    const [y25, y26] = years;
    expect(y25!.weeks.hours).toHaveLength(53);
    expect(y25!.weeks.hours.slice(0, 3)).toEqual([1, 3, 3]);
    expect(y25!.weeks.hours.at(-1)).toBe(4);
    expect(y25!.toDate.hours).toBe(3); // 3 Jan and 10 Jan are on or before 15 Jan
    expect(y26!.weeks.hours).toEqual([3, 3, 3]); // day 15 is in week 3
    expect(y26!.toDate.hours).toBe(3);
  });

  it('counts strength sessions as gym workouts, separately from the riding measures', () => {
    const years = cumulativeByYear(
      [
        act('2026-01-02', 2),
        act('2026-01-05', 1, { isCycling: false, sport: 'strength_training' }),
        act('2026-01-09', 1, { isCycling: false, sport: 'strength_training' }),
        act('2026-01-06', 1, { isCycling: false, sport: 'running' }),
      ],
      { today: '2026-01-15' },
    );
    expect(years[0]!.weeks.gym).toEqual([1, 2, 2]);
    expect(years[0]!.toDate).toMatchObject({ gym: 2, rides: 1, hours: 2 });
    // A year with only gym sessions still appears.
    expect(
      cumulativeByYear([act('2024-03-01', 1, { isCycling: false, sport: 'strength_training' })], {
        today: '2026-01-15',
      }).map((y) => y.year),
    ).toEqual([2024]);
  });

  it('accumulates distance, elevation and ride count the same way', () => {
    const [y] = cumulativeByYear(
      [act('2026-01-03', 1, { elevationGainM: 120 }), act('2026-01-10', 2, { distanceM: null, elevationGainM: null })],
      { today: '2026-01-15' },
    );
    expect(y!.weeks.distanceKm).toEqual([25, 25, 25]); // the second ride has no distance
    expect(y!.weeks.elevationM).toEqual([120, 120, 120]);
    expect(y!.weeks.rides).toEqual([1, 2, 2]);
    expect(y!.toDate).toEqual({ hours: 3, distanceKm: 25, elevationM: 120, rides: 2, gym: 0 });
  });

  it('leaves indoor rides out of distance and elevation but keeps them in hours and rides', () => {
    const [y] = cumulativeByYear([act('2026-01-03', 1), act('2026-01-04', 2, { isIndoor: true })], {
      today: '2026-01-15',
    });
    expect(y!.toDate).toMatchObject({ hours: 3, distanceKm: 25, elevationM: 100, rides: 2 });
  });
});

describe('vo2maxEstimate', () => {
  it('applies the ACSM leg-cycling equation', () => {
    expect(vo2maxEstimate(300, 75)).toBeCloseTo(51.06, 2);
  });
  it('returns null without power or weight', () => {
    expect(vo2maxEstimate(null, 75)).toBeNull();
    expect(vo2maxEstimate(300, null)).toBeNull();
    expect(vo2maxEstimate(0, 75)).toBeNull();
  });
});

describe('efficiencyFactor', () => {
  it('is NP per average heart rate', () => {
    expect(efficiencyFactor(180, 150)).toBeCloseTo(1.2, 5);
    expect(efficiencyFactor(null, 150)).toBeNull();
    expect(efficiencyFactor(180, 0)).toBeNull();
  });
});

describe('eftpSeries', () => {
  const curve = (w20: number) => MEAN_MAX_DURATIONS_S.map((d) => (d <= 1200 ? w20 : null));

  it('samples each week end from the first powered week, capping the last at today', () => {
    const series = eftpSeries(
      [
        { id: '1', date: '2026-10-28', meanMaxPower: curve(200) }, // Wednesday
        { id: '2', date: '2026-11-03', meanMaxPower: curve(220) },
        { id: '3', date: '2026-10-01', meanMaxPower: null },
      ],
      { to: '2026-11-05' },
    );
    expect(series).toEqual([
      { date: '2026-11-01', watts: 190 },
      { date: '2026-11-05', watts: 209 },
    ]);
  });

  it('is empty without power', () => {
    expect(eftpSeries([{ id: '1', date: '2026-10-01', meanMaxPower: null }], { to: '2026-11-05' })).toEqual([]);
  });
});

describe('vo2maxSeries', () => {
  const curve = (w5: number) => MEAN_MAX_DURATIONS_S.map((d) => (d <= 300 ? w5 : null));

  it('uses the best 5-min power in the 90-day window and the weight for each sample date', () => {
    const series = vo2maxSeries(
      [
        { id: 'a', date: '2026-10-27', meanMaxPower: curve(300) },
        { id: 'b', date: '2026-11-03', meanMaxPower: curve(200) }, // easier ride: the window best stays 300 W
      ],
      { to: '2026-11-05', kgOn: (date) => (date >= '2026-11-04' ? 75 : 80) },
    );
    expect(series.map((s) => [s.date, s.best5minW, s.kg, s.activityId])).toEqual([
      ['2026-11-01', 300, 80, 'a'],
      ['2026-11-05', 300, 75, 'a'],
    ]);
    expect(series[1]!.vo2max).toBeCloseTo(51.06, 2);
  });

  it('skips weeks without a weight', () => {
    expect(
      vo2maxSeries([{ id: 'a', date: '2026-10-27', meanMaxPower: curve(300) }], { to: '2026-11-01', kgOn: () => null }),
    ).toEqual([]);
  });
});

describe('zonePeriods', () => {
  const ride = (date: string, power: number[] | null, hr: number[] | null, isCycling = true) => ({
    date,
    isCycling,
    zones: { power: power ? { seconds: power } : null, hr: hr ? { seconds: hr } : null },
  });

  it('sums zone seconds per ISO week with empty weeks, cycling only', () => {
    const weeks = zonePeriods(
      [
        ride('2026-01-05', [60, 0, 0, 0, 0, 0, 0], [30, 30, 0, 0, 0]),
        ride('2026-01-07', [0, 120, 0, 0, 0, 0, 0], null),
        ride('2026-01-20', null, [0, 0, 0, 10, 0]),
        ride('2026-01-21', null, [999, 0, 0, 0, 0], false), // strength: ignored
      ],
      { by: 'week', to: '2026-01-25' },
    );
    expect(weeks.map((w) => w.period)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
    expect(weeks[0]).toEqual({ period: '2026-01-05', power: [60, 120, 0, 0, 0, 0, 0], hr: [30, 30, 0, 0, 0] });
    expect(weeks[1]!.hr).toEqual([0, 0, 0, 0, 0]);
    expect(weeks[2]!.hr).toEqual([0, 0, 0, 10, 0]);
  });

  it('sums per month across a year boundary', () => {
    const months = zonePeriods(
      [ride('2025-12-31', [1, 0, 0, 0, 0, 0, 0], null), ride('2026-02-01', [2, 0, 0, 0, 0, 0, 0], null)],
      { by: 'month', to: '2026-02-10' },
    );
    expect(months.map((m) => [m.period, m.power[0]])).toEqual([
      ['2025-12', 1],
      ['2026-01', 0],
      ['2026-02', 2],
    ]);
  });
});
