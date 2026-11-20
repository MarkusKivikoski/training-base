import type { Activity, PlannedSession } from '@/shared/api/client';

export type SessionStatus = 'done' | 'missed' | 'upcoming';

export type SessionMatch = {
  session: PlannedSession;
  status: SessionStatus;
  /** The ride that completed the session, when done. */
  ride: Activity | undefined;
};

/**
 * Pairs a day's planned sessions with its rides, both in order (rides by start time). A session
 * with a ride is done; without one it's missed if the day is past, otherwise still upcoming.
 * Other activities, such as strength training, never complete a session.
 */
export const matchSessions = (
  date: string,
  sessions: readonly PlannedSession[],
  activities: readonly Activity[],
  today: string,
): SessionMatch[] => {
  const rides = activities
    .filter((activity) => activity.isCycling)
    .sort((first, second) => first.startTimeLocal.localeCompare(second.startTimeLocal));
  const isPast = date < today;

  return sessions.map((session, i) => {
    const ride = rides[i];
    if (ride) return { session, status: 'done', ride };
    return { session, status: isPast ? 'missed' : 'upcoming', ride: undefined };
  });
};

export type PlanProgress = { done: number; due: number };

/** How many of the sessions that are due by now (today or earlier) were done. */
export const planProgress = (matches: readonly SessionMatch[]): PlanProgress => {
  let done = 0;
  let due = 0;
  for (const match of matches) {
    if (match.status === 'upcoming') continue;
    due += 1;
    if (match.status === 'done') done += 1;
  }
  return { done, due };
};
