import { describe, expect, it } from 'vitest';
import type { Activity, PlannedSession } from '@/shared/api/client';
import { matchSessions, planProgress } from './planMatching';

const session = (id: string): PlannedSession => ({ id, date: '2026-11-09', title: id, intensity: 'easy' });
const activity = (id: string, startTimeLocal: string, isCycling = true) =>
  ({ id, startTimeLocal, isCycling }) as Activity;

const TODAY = '2026-11-10';

describe('matchSessions', () => {
  it('pairs sessions with the day’s rides in start order, ignoring other sports', () => {
    const matches = matchSessions(
      '2026-11-09',
      [session('first'), session('second'), session('third')],
      [
        activity('evening', '2026-11-09T18:00:00'),
        activity('gym', '2026-11-09T07:00:00', false),
        activity('morning', '2026-11-09T08:00:00'),
      ],
      TODAY,
    );
    expect(matches.map((m) => [m.session.id, m.status, m.ride?.id])).toEqual([
      ['first', 'done', 'morning'],
      ['second', 'done', 'evening'],
      ['third', 'missed', undefined],
    ]);
  });

  it('leaves today and later upcoming until a ride syncs', () => {
    expect(matchSessions('2026-11-10', [session('a')], [], TODAY)[0]!.status).toBe('upcoming');
    expect(matchSessions('2026-11-12', [session('a')], [], TODAY)[0]!.status).toBe('upcoming');
    expect(matchSessions('2026-11-10', [session('a')], [activity('r', '2026-11-10T09:00:00')], TODAY)[0]!.status).toBe(
      'done',
    );
  });
});

describe('planProgress', () => {
  it('counts done sessions out of those due', () => {
    const matches = [
      ...matchSessions('2026-11-09', [session('a'), session('b')], [activity('r', '2026-11-09T08:00:00')], TODAY),
      ...matchSessions('2026-11-12', [session('c')], [], TODAY),
    ];
    expect(planProgress(matches)).toEqual({ done: 1, due: 2 });
  });
});
