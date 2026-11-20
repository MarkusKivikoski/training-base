import { describe, expect, it } from 'vitest';
import { calendarSearch, validateCalendarSearch } from './search';

describe('calendar search', () => {
  it('keeps a valid month and a non-default background', () => {
    expect(validateCalendarSearch({ month: '2026-10', bg: 'fitness' })).toEqual({ month: '2026-10', bg: 'fitness' });
    expect(validateCalendarSearch({ month: '2026-13', bg: 'fatigue' })).toEqual({});
  });

  it('keeps a valid week to highlight', () => {
    expect(validateCalendarSearch({ month: '2026-10', week: '2026-09-28' })).toEqual({
      month: '2026-10',
      week: '2026-09-28',
    });
    expect(validateCalendarSearch({ week: '2026-09-32' })).toEqual({});
    expect(validateCalendarSearch({ week: 20260928 })).toEqual({});
  });

  it('leaves the defaults out of the URL', () => {
    expect(calendarSearch('2026-11', 'fatigue', '2026-11')).toEqual({});
    expect(calendarSearch('2026-10', 'off', '2026-11')).toEqual({ month: '2026-10', bg: 'off' });
  });
});
