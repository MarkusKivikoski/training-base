import { describe, expect, it } from 'vitest';
import { heatmapSearch, periodValue, scopeLabel, toHeatmapInput, validateHeatmapSearch } from './search';

describe('heatmap search', () => {
  it('keeps valid filters, a range replacing the year', () => {
    expect(validateHeatmapSearch({ year: '2025', sport: 'gravel_cycling', mode: 'solid' })).toEqual({
      year: 2025,
      sport: 'gravel_cycling',
      mode: 'solid',
    });
    expect(validateHeatmapSearch({ year: 2025, from: '2026-09-01' })).toEqual({ from: '2026-09-01' });
    expect(validateHeatmapSearch({ year: 1900, from: '1.9.2026', sport: 'Road', mode: 'heatmap' })).toEqual({});
  });

  it('shows rides by default, runs or both by choice, and the ride type only for rides', () => {
    expect(validateHeatmapSearch({ show: 'running', year: '2025' })).toEqual({ show: 'running', year: 2025 });
    expect(validateHeatmapSearch({ show: 'cycling' })).toEqual({});
    expect(validateHeatmapSearch({ show: 'all', sport: 'gravel_cycling' })).toEqual({ show: 'all' });
    expect(toHeatmapInput({ show: 'running', year: 2025 })).toEqual({ discipline: 'running', year: 2025 });
  });

  it('leaves defaults out when building the URL', () => {
    expect(heatmapSearch({ mode: 'heatmap' })).toEqual({});
    expect(heatmapSearch({ year: 2025, to: '2026-11-09', mode: 'heatmap' })).toEqual({ to: '2026-11-09' });
  });

  it('maps filters to the query and labels', () => {
    expect(toHeatmapInput({ year: 2025, sport: 'road_biking' })).toEqual({ year: 2025, sports: ['road_biking'] });
    expect(periodValue({ from: '2026-09-01' })).toBe('range');
    expect(periodValue({ year: 2024 })).toBe('2024');
    expect(periodValue({})).toBe('all');
    expect(scopeLabel({ from: '2026-09-01' })).toBe('1.9.2026 – today');
    expect(scopeLabel({})).toBe('all years');
  });
});
