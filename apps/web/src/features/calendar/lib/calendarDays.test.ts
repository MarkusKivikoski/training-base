import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { activitiesByDate, activitiesOn, entryDetail, entryKind, entryTss, weekdayAndDay } from './calendarDays';

const activity = (id: string, o: Partial<Activity> = {}) =>
  ({
    id,
    date: '2026-11-03',
    startTimeLocal: '2026-11-03T10:00:00',
    isCycling: true,
    isIndoor: false,
    sport: 'road_biking',
    distanceM: 45300,
    durationS: 6120,
    movingDurationS: 6120,
    ...o,
  }) as Activity;

describe('calendar days', () => {
  it('groups by date, oldest first within a day', () => {
    const byDate = activitiesByDate([
      activity('late', { startTimeLocal: '2026-11-03T18:00:00' }),
      activity('other', { date: '2026-11-04' }),
      activity('early', { startTimeLocal: '2026-11-03T07:00:00' }),
    ]);
    expect(byDate.get('2026-11-03')!.map((a) => a.id)).toEqual(['early', 'late']);
    expect(activitiesOn(['2026-11-04', '2026-11-05', '2026-11-03'], byDate).map((a) => a.id)).toEqual([
      'other',
      'early',
      'late',
    ]);
  });

  it('describes entries', () => {
    expect(entryDetail(activity('a'))).toBe('1 h 42 min · 45.3 km');
    expect(entryDetail(activity('a', { isIndoor: true }))).toBe('1 h 42 min');
    expect(entryKind(activity('a', { isIndoor: true }))).toBe('Indoor ride');
    expect(entryKind(activity('a', { isCycling: false, sport: 'strength_training' }))).toBe('Strength training');
  });

  it('shows the TSS of rides with training load', () => {
    expect(entryTss(activity('a', { load: { tss: 84.6, source: 'hr' } }))).toBe('85 TSS');
    expect(entryTss(activity('a', { load: null }))).toBeNull();
    expect(entryTss(activity('a', { isCycling: false, load: { tss: 40, source: 'hr' } }))).toBeNull();
  });

  it('names the weekday', () => {
    expect(weekdayAndDay('2026-11-03')).toBe('Tue 3');
    expect(weekdayAndDay('2026-11-08')).toBe('Sun 8');
  });
});
