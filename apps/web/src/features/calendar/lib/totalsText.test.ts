import type { WeekTotals } from '@app/metrics';
import { describe, expect, it } from 'vitest';
import { agendaWeekTitle, monthTotalParts } from './totalsText';

const totals = (o: Partial<WeekTotals> = {}): WeekTotals => ({
  movingS: 0,
  outdoorDistanceM: 0,
  rides: 0,
  tss: 0,
  outdoorElevationM: 0,
  gymSessions: 0,
  otherActivities: 0,
  ...o,
});

describe('totals text', () => {
  it('lists month figures, leaving out empty ones', () => {
    expect(monthTotalParts(totals())).toEqual([{ label: 'rides', value: '0' }]);
    const parts = monthTotalParts(
      totals({ rides: 1, movingS: 3600, outdoorDistanceM: 30000, tss: 50, gymSessions: 3, otherActivities: 2 }),
    );
    expect(parts.map((part) => part.label)).toEqual([
      'riding',
      'outdoors',
      'ride',
      'TSS',
      'gym sessions',
      'other activities',
    ]);
    expect(parts.find((part) => part.label === 'gym sessions')?.value).toBe('3');
    expect(monthTotalParts(totals({ gymSessions: 1 })).map((part) => part.label)).toContain('gym session');
  });

  it('titles an agenda week', () => {
    expect(agendaWeekTitle('2026-11-02', totals())).toBe('Week of 2.11.');
    expect(agendaWeekTitle('2026-11-02', totals({ rides: 2, movingS: 3600, tss: 80 }))).toBe(
      'Week of 2.11. · 1 h · TSS 80',
    );
    expect(agendaWeekTitle('2026-11-02', totals({ gymSessions: 2 }))).toBe('Week of 2.11. · 2 gym');
  });
});
