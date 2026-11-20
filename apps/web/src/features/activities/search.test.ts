import { describe, expect, it } from 'vitest';
import { hasActiveFilters, mergeActivitySearch, toActivityListInput, validateActivitySearch } from './search';

describe('validateActivitySearch', () => {
  it('keeps valid filters', () => {
    expect(
      validateActivitySearch({
        sport: 'all',
        q: 'Nuuksio',
        type: 'gravel_cycling',
        env: 'outdoor',
        from: '2026-01-01',
        to: '2026-06-30',
        minKm: '20',
        maxKm: 80,
        power: '1',
      }),
    ).toEqual({
      sport: 'all',
      q: 'Nuuksio',
      type: 'gravel_cycling',
      env: 'outdoor',
      from: '2026-01-01',
      to: '2026-06-30',
      minKm: 20,
      maxKm: 80,
      power: 1,
    });
  });

  it('drops invalid or empty values', () => {
    expect(
      validateActivitySearch({
        sport: 'cycling',
        q: '',
        type: 'Road Biking',
        env: 'space',
        from: '1.1.2026',
        minKm: -5,
        maxKm: 'far',
        power: 0,
      }),
    ).toEqual({});
  });

  it('keeps a known sort column and direction only', () => {
    expect(validateActivitySearch({ sort: 'distance', order: 'asc' })).toEqual({ sort: 'distance', order: 'asc' });
    expect(validateActivitySearch({ sort: 'speed', order: 'up' })).toEqual({});
  });

  it('accepts a numeric search and caps its length', () => {
    expect(validateActivitySearch({ q: 2026 })).toEqual({ q: '2026' });
    expect(validateActivitySearch({ q: 'x'.repeat(150) }).q).toHaveLength(100);
  });
});

describe('mergeActivitySearch', () => {
  it('applies the patch and removes emptied filters', () => {
    expect(mergeActivitySearch({ q: 'loop', minKm: 10 }, { q: '', maxKm: 50, minKm: undefined })).toEqual({
      maxKm: 50,
    });
  });
});

describe('hasActiveFilters', () => {
  it('ignores the sport scope', () => {
    expect(hasActiveFilters({ sport: 'all' })).toBe(false);
    expect(hasActiveFilters({ minKm: 0 })).toBe(true);
  });
});

describe('toActivityListInput', () => {
  it('maps the URL filters to the list query', () => {
    expect(toActivityListInput({}, 100)).toEqual({ sport: 'cycling', limit: 100 });
    expect(toActivityListInput({ sport: 'all', type: 'road_biking', env: 'indoor', power: 1, minKm: 0 }, 50)).toEqual({
      sport: 'all',
      limit: 50,
      types: ['road_biking'],
      environment: 'indoor',
      minKm: 0,
      hasPower: true,
    });
  });

  it('passes the sort on', () => {
    expect(toActivityListInput({ sort: 'power', order: 'asc', from: '2025-01-01' }, 100)).toEqual({
      sport: 'cycling',
      limit: 100,
      sort: 'power',
      order: 'asc',
      from: '2025-01-01',
    });
  });
});
