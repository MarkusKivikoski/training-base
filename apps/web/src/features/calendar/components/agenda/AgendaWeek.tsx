import { weekTotals } from '@app/metrics';
import type { MonthView } from '../../hooks/useCalendarMonth';
import { activitiesOn, isInMonth } from '../../lib/calendarDays';
import { agendaWeekTitle } from '../../lib/totalsText';
import { ActivityEntry } from '../ActivityEntry';
import { CopyWeekSummaryButton } from '../CopyWeekSummaryButton';
import { WeekHighlight } from '../WeekHighlight';
import { EventEntry } from '../plan/EventEntry';
import { PlannedEntry } from '../plan/PlannedEntry';
import { AgendaDayLabel } from './AgendaDayLabel';

type AgendaWeekProps = {
  view: MonthView;
  week: string[];
  /** Flash a highlight over the week (opened from another page). */
  isHighlighted: boolean;
};

/** One week of the agenda: its days in the month with activities, plans or events. Renders nothing for an empty week. */
export const AgendaWeek = ({ view, week, isHighlighted }: AgendaWeekProps) => {
  const datesInMonth = week.filter((date) => isInMonth(date, view.month));
  const hasItems = (date: string) =>
    view.activitiesByDate.has(date) || view.plannedByDate.has(date) || view.eventsByDate.has(date);
  const activeDates = datesInMonth.filter(hasItems);
  if (activeDates.length === 0) return null;

  const totals = weekTotals(activitiesOn(datesInMonth, view.activitiesByDate));

  return (
    <section className="relative rounded-xl border border-line bg-surface-1 p-3">
      {isHighlighted && <WeekHighlight />}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-ink-2">{agendaWeekTitle(week[0]!, totals)}</h2>
        <CopyWeekSummaryButton view={view} week={week} />
      </div>
      <ul className="divide-y divide-line">
        {activeDates.map((date) => (
          <li key={date} className="flex gap-3 py-2">
            <AgendaDayLabel view={view} date={date} />
            <div className="min-w-0 flex-1 space-y-1">
              {(view.eventsByDate.get(date) ?? []).map((event) => (
                <EventEntry key={event.id} event={event} />
              ))}
              {(view.activitiesByDate.get(date) ?? []).map((activity) => (
                <ActivityEntry key={activity.id} activity={activity} />
              ))}
              {(view.matchesByDate.get(date) ?? []).map((match) => (
                <PlannedEntry key={match.session.id} match={match} presets={view.presets} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
