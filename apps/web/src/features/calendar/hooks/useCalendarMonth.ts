import { addDays, BASELINE_DAYS, monthGrid, weekTotals, type WeekTotals } from '@app/metrics';
import { useMemo } from 'react';
import type { Activity, PlannedEvent, PlannedSession, PlanPresets } from '@/shared/api/client';
import { useActivities } from '@/shared/api/activities';
import { useDailyLoad } from '@/shared/api/load';
import { usePlan } from '@/shared/api/plan';
import { byDate as groupByDate, sessionsByDate } from '@/shared/lib/plan';
import { ACTIVITY_LIMIT } from '../constants';
import { activitiesByDate, activitiesOn, isInMonth } from '../lib/calendarDays';
import { dayLoadByDate, peakLoad, type DayLoad } from '../lib/dayLoad';
import { matchSessions, type SessionMatch } from '../lib/planMatching';
import type { Background } from '../search';

/** Everything the month grid and agenda need. */
export type MonthView = {
  /** YYYY-MM. */
  month: string;
  today: string;
  /** Monday-to-Sunday weeks covering the month, as dates. */
  weeks: string[][];
  activitiesByDate: Map<string, Activity[]>;
  background: Background;
  /** The background measure per date (empty when it's off). */
  loadByDate: Map<string, DayLoad>;
  /** The background's highest value in the visible weeks. */
  peak: number;
  /** First date the load zones apply, if there is load data. */
  zonesFrom: string | null;
  /** Totals of the days in the month only. */
  monthTotals: WeekTotals;
  hasActivities: boolean;
  /** Planned sessions per date, and the TSS of the presets they use. */
  plannedByDate: Map<string, PlannedSession[]>;
  presets: PlanPresets;
  /** Target events per date. */
  eventsByDate: Map<string, PlannedEvent[]>;
  /** Planned sessions per date with whether a ride completed them. */
  matchesByDate: Map<string, SessionMatch[]>;
};

const NO_DAYS: never[] = [];
const NO_SESSIONS: PlannedSession[] = [];
const NO_EVENTS: PlannedEvent[] = [];
const DEFAULT_PRESETS: PlanPresets = { easy: 40, medium: 70, hard: 100 };

/** The month's activities and daily load, arranged by date. */
export const useCalendarMonth = (month: string | undefined, today: string | undefined, background: Background) => {
  const weeks = useMemo(() => (month ? monthGrid(month) : []), [month]);
  const firstDay = weeks[0]?.[0];
  const lastDay = weeks.at(-1)?.[6];

  const activities = useActivities(
    { sport: 'all', from: firstDay ?? '1970-01-01', to: lastDay ?? '1970-01-01', limit: ACTIVITY_LIMIT },
    { enabled: firstDay !== undefined },
  );
  const load = useDailyLoad();
  const plan = usePlan();
  const sessions = plan.data?.sessions ?? NO_SESSIONS;
  const plannedByDate = useMemo(() => sessionsByDate(sessions), [sessions]);
  const events = plan.data?.events ?? NO_EVENTS;
  const eventsByDate = useMemo(() => groupByDate(events), [events]);

  const loadDays = load.data?.days ?? NO_DAYS;
  const loadByDate = useMemo(() => dayLoadByDate(loadDays, background), [loadDays, background]);

  const view = useMemo((): MonthView | null => {
    if (!month || !today || !activities.data) return null;

    const byDate = activitiesByDate(activities.data.items);
    const monthDates = weeks.flat().filter((date) => isInMonth(date, month));
    const firstLoadDay = loadDays[0]?.date;
    const matchesByDate = new Map<string, SessionMatch[]>();
    for (const [date, daySessions] of plannedByDate) {
      matchesByDate.set(date, matchSessions(date, daySessions, byDate.get(date) ?? [], today));
    }

    return {
      month,
      today,
      weeks,
      activitiesByDate: byDate,
      background,
      loadByDate,
      peak: peakLoad(weeks.flat(), loadByDate),
      zonesFrom: firstLoadDay ? addDays(firstLoadDay, BASELINE_DAYS) : null,
      monthTotals: weekTotals(activitiesOn(monthDates, byDate)),
      hasActivities: monthDates.some((date) => byDate.has(date)),
      plannedByDate,
      presets: plan.data?.presets ?? DEFAULT_PRESETS,
      eventsByDate,
      matchesByDate,
    };
  }, [month, today, weeks, activities.data, background, loadByDate, loadDays, plannedByDate, plan.data, eventsByDate]);

  return { view, isPending: activities.isPending, error: activities.error };
};
