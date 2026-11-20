import { describe, expect, it } from 'vitest';
import { ALL_YEARS, CUSTOM_RANGE, selectedYearValue, yearOptions, yearRangePatch } from './yearFilter';

describe('yearRangePatch', () => {
  it('covers the whole calendar year', () => {
    expect(yearRangePatch('2025')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('clears the dates for all years', () => {
    expect(yearRangePatch(ALL_YEARS)).toEqual({ from: undefined, to: undefined });
  });
});

describe('selectedYearValue', () => {
  it('is "all" without dates', () => {
    expect(selectedYearValue(undefined, undefined)).toBe(ALL_YEARS);
  });

  it('is the year for an exact calendar year', () => {
    expect(selectedYearValue('2026-01-01', '2026-12-31')).toBe('2026');
  });

  it('selects nothing for other ranges', () => {
    expect(selectedYearValue('2026-01-01', '2026-06-30')).toBe(CUSTOM_RANGE);
    expect(selectedYearValue('2025-01-01', '2026-12-31')).toBe(CUSTOM_RANGE);
    expect(selectedYearValue('2026-01-01', undefined)).toBe(CUSTOM_RANGE);
    expect(selectedYearValue(undefined, '2026-12-31')).toBe(CUSTOM_RANGE);
  });
});

describe('yearOptions', () => {
  it('lists "All" and then the years newest first', () => {
    expect(yearOptions([2024, 2026, 2025]).map((option) => option.value)).toEqual([ALL_YEARS, '2026', '2025', '2024']);
  });
});
