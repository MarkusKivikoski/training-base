import { describe, expect, it } from 'vitest';
import { decouplingBasisLabel, decouplingVerdict, formatDecoupling } from './decoupling';

describe('decoupling text', () => {
  it('formats the value with a proper minus', () => {
    expect(formatDecoupling(3.24)).toBe('3.2%');
    expect(formatDecoupling(-1.4)).toBe('−1.4%');
  });

  it('reads the value against the 5% guide', () => {
    expect(decouplingVerdict(4.9)).toBe('well coupled');
    expect(decouplingVerdict(5)).toBe('heart rate drifted');
    expect(decouplingBasisLabel('speed')).toBe('speed vs heart rate');
  });
});
