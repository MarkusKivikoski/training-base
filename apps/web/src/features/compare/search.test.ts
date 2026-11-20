import { describe, expect, it } from 'vitest';
import { validateCompareSearch, withRide } from './search';

describe('compare search', () => {
  it('keeps valid activity ids as strings', () => {
    expect(validateCompareSearch({ a: 25012996238, b: '24767484293' })).toEqual({
      a: '25012996238',
      b: '24767484293',
    });
    expect(validateCompareSearch({ a: '0123', b: 'x' })).toEqual({});
  });

  it('sets or clears one ride', () => {
    expect(withRide({ a: '1' }, 'b', '2')).toEqual({ a: '1', b: '2' });
    expect(withRide({ a: '1', b: '2' }, 'a', '')).toEqual({ b: '2' });
  });
});
