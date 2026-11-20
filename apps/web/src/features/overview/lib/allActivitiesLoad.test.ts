import type { WeekCategoryLoad } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { countOtherSports, groupsWithLoad, lastSevenDaysTss, weekTotal } from './allActivitiesLoad';

const activity = (date: string, isCycling: boolean, tss: number | null, avgHr: number | null = 140) => ({
  date,
  sport: isCycling ? 'cycling' : 'strength_training',
  isCycling,
  load: isCycling && tss !== null ? { tss } : null,
  hrLoad: !isCycling && tss !== null ? { tss } : null,
  avgHr,
});

describe('all-activities load helpers', () => {
  it('sums the last 7 days, cycling and other sports apart', () => {
    const acts = [
      activity('2026-11-08', true, 80),
      activity('2026-11-04', false, 30),
      activity('2026-11-01', true, 99),
    ];
    expect(lastSevenDaysTss(acts, '2026-11-08')).toEqual({ cycling: 80, other: 30 });
  });

  it('counts other sports with and without heart-rate load', () => {
    const acts = [
      activity('2026-11-08', false, 30),
      activity('2026-10-01', false, null),
      activity('2026-10-02', false, null, null),
    ];
    expect(countOtherSports(acts)).toEqual({ withLoad: 1, withoutLoad: 1 });
  });

  it('totals a week and lists only the groups with load', () => {
    const week: WeekCategoryLoad = {
      weekStart: '2026-11-02',
      cycling: 100,
      running: 0,
      strength: 20,
      skiing: 0,
      other: 0,
    };
    expect(weekTotal(week)).toBe(120);
    expect(groupsWithLoad([week])).toEqual(['cycling', 'strength']);
  });
});
