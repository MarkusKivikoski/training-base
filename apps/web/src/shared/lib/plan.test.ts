import { describe, expect, it } from 'vitest';
import type { Plan, PlannedSession } from '@/shared/api/client';
import { countdownText, daysBetween, newSessionId, nextEvent, plannedLoad, plannedTss, sessionsByDate } from './plan';

const presets = { easy: 40, medium: 70, hard: 100 };
const session = (o: Partial<PlannedSession>): PlannedSession => ({
  id: 's',
  date: '2026-11-12',
  title: 'Ride',
  intensity: 'easy',
  ...o,
});

describe('plan helpers', () => {
  it('takes preset TSS unless the session is custom', () => {
    expect(plannedTss(session({ intensity: 'hard' }), presets)).toBe(100);
    expect(plannedTss(session({ intensity: 'custom', tss: 55 }), presets)).toBe(55);
  });

  it('lists planned load and groups sessions by date', () => {
    const plan: Plan = {
      schemaVersion: 1,
      presets,
      sessions: [
        session({ id: 'a' }),
        session({ id: 'b', intensity: 'medium' }),
        session({ id: 'c', date: '2026-11-13' }),
      ],
      events: [],
    };
    expect(plannedLoad(plan)).toEqual([
      { date: '2026-11-12', tss: 40 },
      { date: '2026-11-12', tss: 70 },
      { date: '2026-11-13', tss: 40 },
    ]);
    expect(
      sessionsByDate(plan.sessions)
        .get('2026-11-12')
        ?.map((s) => s.id),
    ).toEqual(['a', 'b']);
  });

  it('makes ids the API accepts', () => {
    expect(newSessionId()).toMatch(/^[a-z0-9-]{1,40}$/);
  });
});

describe('events', () => {
  const events = [
    { id: 'b', date: '2027-06-14', name: 'Kalevan kierros' },
    { id: 'old', date: '2026-09-01', name: 'Past' },
    { id: 'a', date: '2026-12-31', name: 'New year ride' },
  ];

  it('finds the next event from today on', () => {
    expect(nextEvent(events, '2026-11-10')?.id).toBe('a');
    expect(nextEvent(events, '2026-12-31')?.id).toBe('a');
    expect(nextEvent(events, '2027-07-01')).toBeUndefined();
  });

  it('counts the days to it', () => {
    expect(daysBetween('2026-11-10', '2026-12-31')).toBe(51);
    expect(daysBetween('2027-03-27', '2027-03-29')).toBe(2);
    expect(countdownText('2026-11-10', '2026-11-10')).toBe('today');
    expect(countdownText('2026-11-10', '2026-11-11')).toBe('tomorrow');
    expect(countdownText('2026-11-10', '2026-12-31')).toBe('in 51 days');
  });
});
