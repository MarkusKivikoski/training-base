import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '@/shared/api/client';
import { sessionsByDate } from '@/shared/lib/plan';
import { upcomingPlannedTss } from './planTotals';

const session = (id: string, date: string, o: Partial<PlannedSession> = {}): PlannedSession => ({
  id,
  date,
  title: 'Ride',
  intensity: 'easy',
  ...o,
});

describe('upcomingPlannedTss', () => {
  it('sums planned TSS from a date on', () => {
    const byDate = sessionsByDate([
      session('past', '2026-11-09'),
      session('today', '2026-11-10', { intensity: 'hard' }),
      session('later', '2026-11-12', { intensity: 'custom', tss: 25 }),
    ]);
    const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
    expect(upcomingPlannedTss(week, byDate, { easy: 40, medium: 70, hard: 100 }, '2026-11-10')).toBe(125);
  });
});
