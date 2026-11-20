import { formatShortDate } from '@/shared/lib/formatters';
import type { MonthView } from '../../hooks/useCalendarMonth';
import { isInMonth } from '../../lib/calendarDays';
import { dayLoadText } from '../../lib/dayLoad';
import { ActivityEntry } from '../ActivityEntry';
import { AddPlanButton } from '../plan/AddPlanButton';
import { EventEntry } from '../plan/EventEntry';
import { PlannedEntry } from '../plan/PlannedEntry';

type DayCellProps = {
  view: MonthView;
  date: string;
};

const TODAY_CLASS = 'inline-flex size-5 items-center justify-center rounded-full bg-ink font-semibold text-surface-1';

const dayNumberClass = (isToday: boolean, isThisMonth: boolean) => {
  if (isToday) return TODAY_CLASS;
  return isThisMonth ? 'text-ink-2' : 'text-ink-3/70';
};

/** One day of the month grid: its number, events, activities and planned sessions, with the background value as text. */
export const DayCell = ({ view, date }: DayCellProps) => {
  const isToday = date === view.today;
  const isThisMonth = isInMonth(date, view.month);
  const loadText = dayLoadText(view.loadByDate.get(date), view.background);
  const activities = view.activitiesByDate.get(date) ?? [];
  const planned = view.matchesByDate.get(date) ?? [];
  const events = view.eventsByDate.get(date) ?? [];
  const canPlan = date >= view.today;

  return (
    <div
      title={loadText}
      className={`group relative min-w-0 border-r border-line p-1.5 ${isThisMonth ? '' : 'bg-surface-0/60'}`}
    >
      {loadText && <span className="sr-only">{loadText}</span>}
      <div className="mb-1 flex items-center justify-between px-1 text-xs">
        <span
          className={dayNumberClass(isToday, isThisMonth)}
          aria-label={isToday ? `Today, ${formatShortDate(date)}` : undefined}
        >
          {Number(date.slice(8))}
        </span>
        {canPlan && <AddPlanButton date={date} />}
      </div>
      <div className={`space-y-0.5 ${isThisMonth ? '' : 'opacity-60'}`}>
        {events.map((event) => (
          <EventEntry key={event.id} event={event} compact />
        ))}
        {activities.map((activity) => (
          <ActivityEntry key={activity.id} activity={activity} compact />
        ))}
        {planned.map((match) => (
          <PlannedEntry key={match.session.id} match={match} presets={view.presets} compact />
        ))}
      </div>
    </div>
  );
};
