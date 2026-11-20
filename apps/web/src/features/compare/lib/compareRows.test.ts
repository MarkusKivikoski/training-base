import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/api/client';
import { COMPARE_ROWS, formattedDifference, formattedValue, visibleRows } from './compareRows';

const ride = (o: Partial<Activity>) =>
  ({
    isIndoor: false,
    isCycling: true,
    hasPower: false,
    distanceM: 40000,
    elevationGainM: 300,
    avgPower: null,
    avgHr: 140,
    maxHr: 170,
    avgCadence: 85,
    activeCalories: 800,
    metrics: null,
    load: null,
    ...o,
  }) as Activity;

const row = (label: string) => COMPARE_ROWS.find((r) => r.label === label)!;

describe('compare rows', () => {
  it('hides rows neither ride has', () => {
    const labels = visibleRows(ride({}), ride({ isIndoor: true })).map((r) => r.label);
    expect(labels).toContain('Elevation gain');
    expect(labels).not.toContain('Avg power');
    expect(labels).not.toContain('TSS');
  });

  it('formats values and signed differences', () => {
    const a = ride({ avgHr: 150 });
    const b = ride({ avgHr: 142.4 });
    expect(formattedValue(row('Avg heart rate'), a)).toBe('150 bpm');
    expect(formattedDifference(row('Avg heart rate'), a, b)).toBe('−8 bpm');
    expect(formattedDifference(row('Elevation gain'), a, ride({ elevationGainM: 410 }))).toBe('+110 m');
  });

  it('shows no difference when one ride lacks the value', () => {
    expect(formattedValue(row('Elevation gain'), ride({ isIndoor: true }))).toBeNull();
    expect(formattedDifference(row('Elevation gain'), ride({}), ride({ isIndoor: true }))).toBeNull();
  });
});
