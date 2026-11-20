import { describe, expect, it } from 'vitest';
import type { Trends } from '@/shared/api/client';
import { comparedYears, differenceText, partialFirstYear } from './comparedYears';

const months = (...keys: string[]) => keys.map((month) => ({ month })) as Trends['months'];
const years = (...numbers: number[]) => numbers.map((year) => ({ year })) as Trends['years'];

describe('compared years', () => {
  it('leaves out a first year that starts after January', () => {
    expect(partialFirstYear(months('2021-12', '2022-01'))).toBe(2021);
    expect(partialFirstYear(months('2022-01'))).toBeNull();
    expect(partialFirstYear(months())).toBeNull();
    expect(comparedYears(years(2021, 2022, 2023), 2021).map((y) => y.year)).toEqual([2022, 2023]);
  });

  it('formats a signed difference', () => {
    const short = (value: number) => `${value} km`;
    expect(differenceText(120.04, short)).toBe('+120 km');
    expect(differenceText(-3.26, short)).toBe('−3.3 km');
  });
});
