import { describe, expect, it } from 'vitest';
import type { DayLoad } from '@/shared/api/client';
import { projectedRowOn, sessionsBefore } from './eventProjection';

const days: DayLoad[] = [
  { date: '2026-11-09', tss: 60, ctl: 20, atl: 30, tsb: -5 },
  { date: '2026-11-10', tss: 0, ctl: 19.5, atl: 25.7, tsb: -10 },
];

describe('event projection', () => {
  it('projects to the event day with rest after the last plan', () => {
    const row = projectedRowOn(days, [{ date: '2026-11-12', tss: 100 }], '2026-11-10', '2026-11-20');
    expect(row).toMatchObject({ date: '2026-11-20', isPlanned: true, tss: 0 });
    // Ten days later with one hard session, then rest: fresher than now.
    expect(row!.tsb).toBeGreaterThan(-10);
  });

  it('uses the ridden day when the event is in the data', () => {
    expect(projectedRowOn(days, [], '2026-11-10', '2026-11-10')).toMatchObject({ isPlanned: false, ctl: 19.5 });
  });

  it('counts the sessions planned before the event', () => {
    const planned = [
      { date: '2026-11-10', tss: 50 },
      { date: '2026-11-12', tss: 50 },
      { date: '2026-11-20', tss: 50 },
      { date: '2026-11-25', tss: 50 },
    ];
    expect(sessionsBefore(planned, '2026-11-10', '2026-11-20')).toBe(2);
  });
});
