import { describe, expect, it } from 'vitest';
import { toLocalIsoDate } from './dates';

describe('toLocalIsoDate', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalIsoDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
  });
});
