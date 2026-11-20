import { describe, expect, it } from 'vitest';
import { rpeLoad } from '../src/index.js';

describe('rpeLoad', () => {
  it('gives 100 for an hour at threshold effort', () => {
    expect(rpeLoad(7, 3600)).toBeCloseTo(100, 10);
  });

  it('scales with time and the square of the rating', () => {
    expect(rpeLoad(7, 1800)).toBeCloseTo(50, 10);
    expect(rpeLoad(3.5, 3600)).toBeCloseTo(25, 10);
  });
});
