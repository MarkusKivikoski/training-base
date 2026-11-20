import type { LoadZone } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { formatRatio, formatSignedPercent, zoneRangeInSymbols, zoneRangeInWords } from './zoneText';

const zone = (min: number | null, max: number | null): LoadZone => ({ status: 'good', label: 'Optimal', min, max });

describe('zone ranges', () => {
  it('describes open and closed ranges in words', () => {
    const x = (v: number) => `${v}×`;
    expect(zoneRangeInWords(zone(null, 0.8), x)).toBe('below 0.8×');
    expect(zoneRangeInWords(zone(1.5, null), x)).toBe('1.5× and up');
    expect(zoneRangeInWords(zone(0.8, 1.3), x)).toBe('0.8× to 1.3×');
  });

  it('describes them in symbols', () => {
    expect(zoneRangeInSymbols(zone(null, 0.8))).toBe('< 0.8');
    expect(zoneRangeInSymbols(zone(1.6, null))).toBe('≥ 1.6');
    expect(zoneRangeInSymbols(zone(0.8, 1.2))).toBe('0.8–1.2');
  });
});

describe('number formats', () => {
  it('signs percentages and rounds ratios', () => {
    expect(formatSignedPercent(12.4)).toBe('+12%');
    expect(formatSignedPercent(-3)).toBe('-3%');
    expect(formatSignedPercent(0)).toBe('0%');
    expect(formatRatio(1.054)).toBe('1.05×');
  });
});
