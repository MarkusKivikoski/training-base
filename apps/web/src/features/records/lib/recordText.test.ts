import { describe, expect, it } from 'vitest';
import { validateRecordsSearch } from '../search';
import {
  biggestGainDetail,
  breakDetail,
  breakLength,
  climbLength,
  hillinessText,
  longestClimbDetail,
  streakDates,
  streakLength,
} from './recordText';

describe('records search', () => {
  it('keeps a plausible year only', () => {
    expect(validateRecordsSearch({ year: '2025' })).toEqual({ year: 2025 });
    expect(validateRecordsSearch({ year: '1980' })).toEqual({});
    expect(validateRecordsSearch({ year: 'x' })).toEqual({});
  });

  it('names runs in the URL and leaves rides, the default, out', () => {
    expect(validateRecordsSearch({ sport: 'running', year: '2025' })).toEqual({ year: 2025, sport: 'running' });
    expect(validateRecordsSearch({ sport: 'cycling' })).toEqual({});
    expect(validateRecordsSearch({ sport: 'skiing' })).toEqual({});
  });
});

describe('record text', () => {
  it('formats distances and hilliness', () => {
    expect(climbLength(850)).toBe('850 m');
    expect(climbLength(1620)).toBe('1.62 km');
    expect(hillinessText(12)).toBe('12.0 m/km');
  });

  it('describes climbs', () => {
    expect(longestClimbDetail({ date: '2026-01-01', value: 1600, extra: 80 })).toBe('80 m at 5.0%');
    expect(biggestGainDetail({ date: '2026-01-01', value: 80, extra: 1600 })).toBe('1.60 km at 5.0%');
  });

  it('describes breaks and streaks', () => {
    expect(breakLength(1)).toBe('1 day');
    expect(breakDetail({ date: '2026-03-13', value: 12 })).toBe('1.3.2026 – 12.3.2026, back with');
    expect(streakLength(null, 'day')).toBe('—');
    expect(streakLength({ length: 3, from: '2026-03-02', to: '2026-03-16' }, 'week')).toBe('3 weeks');
    expect(streakDates({ length: 1, from: '2026-03-02', to: '2026-03-02' }, true)).toBe('Week of 2.3.2026');
    expect(streakDates({ length: 3, from: '2026-03-02', to: '2026-03-04' }, false)).toBe('2.3.2026 – 4.3.2026');
  });
});
