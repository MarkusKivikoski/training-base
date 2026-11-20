import type { YearTotals } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import type { ClimbSummary, RecordsResponse } from '@/shared/api/client';
import { validateReviewSearch } from '../search';
import { yearHighlights } from './highlights';
import { activityMix, changeText, comparisonLabel, periodNote, totalTiles } from './yearTotals';

type Scope = NonNullable<RecordsResponse['scope']>;

const totals = (o: Partial<YearTotals> = {}): YearTotals => ({
  rides: 0,
  indoorRides: 0,
  outdoorRides: 0,
  movingS: 0,
  distanceM: 0,
  elevationM: 0,
  gym: 0,
  activeDays: 0,
  others: { strength: 0, running: 0, skiing: 0, other: 0 },
  ...o,
});

const emptyScope = () =>
  ({
    longestDistance: [],
    longestTime: [],
    highs: { elevation: [], avgSpeed: [] },
    periods: { week: { hours: [] }, month: { hours: [] } },
    streaks: { days: null },
    power: [],
    efforts: [],
    climbs: { biggestGain: [] },
    firstRides: [],
    breaks: [],
  }) as unknown as Scope;

describe('review search', () => {
  it('keeps a plausible year', () => {
    expect(validateReviewSearch({ year: '2025' })).toEqual({ year: 2025 });
    expect(validateReviewSearch({ year: 'soon' })).toEqual({});
    expect(validateReviewSearch({ year: '2025', sport: 'running' })).toEqual({ year: 2025, sport: 'running' });
    expect(validateReviewSearch({ sport: 'cycling' })).toEqual({});
  });
});

describe('year totals', () => {
  it('describes the change against the year before', () => {
    expect(changeText(110, 100, 2025, String)).toBe('+10 (+10%) vs 2025');
    expect(changeText(90, 100, 2025, String)).toBe('−10 (−10%) vs 2025');
    expect(changeText(5, 0, 2025, String)).toBe('new vs 2025');
    expect(changeText(0, 0, 2025, String)).toBeNull();
  });

  it('builds the tiles', () => {
    const tiles = totalTiles(totals({ rides: 12 }), totals({ rides: 10 }), 2025);
    expect(tiles.map((tile) => tile.label)).toEqual([
      'Rides',
      'Riding time',
      'Distance',
      'Climbing',
      'Gym workouts',
      'Active days',
    ]);
    expect(tiles[0]).toEqual({ label: 'Rides', value: '12', change: '+2 (+20%) vs 2025' });
    const runTiles = totalTiles(totals({ rides: 3 }), totals(), 2025, 'running');
    expect(runTiles.slice(0, 2).map((tile) => tile.label)).toEqual(['Runs', 'Running time']);
  });

  it('compares a year in progress with the same part of the year before', () => {
    expect(comparisonLabel(2026, '2026-11-09')).toBe('2025 by 9.11.');
    expect(comparisonLabel(2025, '2026-11-09')).toBe('2024');
    expect(periodNote(2025, '2026-11-09')).toBe('The whole year, compared with 2024.');
  });

  it('splits activities by type', () => {
    const mix = activityMix(
      totals({ outdoorRides: 3, indoorRides: 1, others: { strength: 4, running: 0, skiing: 0, other: 0 } }),
    );
    expect(mix).toEqual([
      { label: 'Outdoor rides', count: 3, percent: 37.5 },
      { label: 'Indoor rides', count: 1, percent: 12.5 },
      { label: 'Strength', count: 4, percent: 50 },
    ]);
    expect(activityMix(totals())).toEqual([]);
  });
});

describe('year highlights', () => {
  it('leaves out highlights without data', () => {
    expect(yearHighlights({ scope: emptyScope(), maxHr: null, newClimbs: [], discipline: 'cycling' })).toEqual([]);
    expect(yearHighlights({ scope: emptyScope(), maxHr: null, newClimbs: [], discipline: 'running' })).toEqual([]);
  });

  it('builds details for rides, periods and new climbs', () => {
    const scope = emptyScope();
    scope.longestDistance = [{ id: '7', name: 'Big loop', date: '2026-06-20', value: 152300 }];
    scope.periods.week.hours = [{ date: '2026-06-15', value: 15 }];
    const newClimbs = [
      { id: 'a', name: null, lengthM: 500, avgGrade: 0.05, gainM: 25 },
      { id: 'b', name: 'Wall', lengthM: 300, avgGrade: 0.1, gainM: 30 },
    ] as ClimbSummary[];

    const highlights = yearHighlights({ scope, maxHr: null, newClimbs, discipline: 'cycling' });
    expect(highlights.map((h) => [h.label, h.value])).toEqual([
      ['Longest ride', '152.3 km'],
      ['Biggest week', '15.0 h'],
      ['New climbs', '2'],
    ]);
    expect(highlights[0]!.detail).toMatchObject({ kind: 'ride', text: '20.6.2026 · Big loop' });
    expect(highlights[2]!.detail).toEqual({ kind: 'climb', climbId: 'b', text: 'Wall', prefix: 'Biggest: ' });
  });

  it('words a year of runs in pace, with the 5 and 10 km bests', () => {
    const scope = emptyScope();
    scope.longestDistance = [{ id: '7', name: 'Long run', date: '2026-06-20', value: 21300 }];
    scope.highs.avgSpeed = [{ id: '8', name: 'Tempo', date: '2026-07-01', value: 3.2 }];
    scope.efforts = [
      { distanceM: 1000, top: [{ id: '8', name: 'Tempo', date: '2026-07-01', value: 250 }] },
      { distanceM: 5000, top: [{ id: '8', name: 'Tempo', date: '2026-07-01', value: 1500 }] },
      { distanceM: 10000, top: [] },
    ];

    const highlights = yearHighlights({ scope, maxHr: null, newClimbs: [], discipline: 'running' });
    expect(highlights.map((h) => [h.label, h.value])).toEqual([
      ['Longest run', '21.3 km'],
      ['Fastest run (5 km+)', '5:13 /km'],
      ['Fastest 5 km', '25:00'],
    ]);
  });
});
