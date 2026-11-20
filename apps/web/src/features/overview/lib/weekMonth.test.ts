import { describe, expect, it } from 'vitest';
import { weekMonth } from './weekMonth';

describe('weekMonth', () => {
  it('returns the month of a week inside one month', () => {
    expect(weekMonth('2026-11-09')).toBe('2026-11');
  });

  it('gives a split week to the month holding most of its days', () => {
    // Mon 28 Sep – Sun 4 Oct: four days in October.
    expect(weekMonth('2026-09-28')).toBe('2026-10');
    // Mon 29 Jun – Sun 5 Jul: two days in June, five in July.
    expect(weekMonth('2026-06-29')).toBe('2026-07');
    // Mon 26 Oct – Sun 1 Nov: six days in October.
    expect(weekMonth('2026-10-26')).toBe('2026-10');
  });

  it('crosses a year boundary', () => {
    // Mon 29 Dec 2025 – Sun 4 Jan 2026.
    expect(weekMonth('2025-12-29')).toBe('2026-01');
  });
});
