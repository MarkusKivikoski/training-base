import { describe, expect, it } from 'vitest';
import { parseMetrics, trendsSearch, validateTrendsSearch } from './search';

describe('trends search', () => {
  it('keeps a metric list and the gym flag', () => {
    expect(validateTrendsSearch({ metrics: 'hours,rides', gym: '1' })).toEqual({ metrics: 'hours,rides', gym: 1 });
    expect(validateTrendsSearch({ metrics: 'hours;drop', gym: 0 })).toEqual({});
  });

  it('parses measures in display order, defaulting to hours', () => {
    expect(parseMetrics('rides,hours,bogus')).toEqual(['hours', 'rides']);
    expect(parseMetrics('bogus')).toEqual(['hours']);
    expect(parseMetrics(undefined)).toEqual(['hours']);
  });

  it('leaves the defaults out of the URL', () => {
    expect(trendsSearch(['hours'], false)).toEqual({});
    expect(trendsSearch(['hours', 'distanceKm'], true)).toEqual({ metrics: 'hours,distanceKm', gym: 1 });
  });
});
