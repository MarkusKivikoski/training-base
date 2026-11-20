import type { MonthView } from '../../hooks/useCalendarMonth';
import { weekdayAndDay } from '../../lib/calendarDays';
import { dayLoadColor, dayLoadIcon, dayLoadText, measureAbbreviation } from '../../lib/dayLoad';

type AgendaDayLabelProps = {
  view: MonthView;
  date: string;
};

/** "Tue 3" with the day's background value under it ("✓ ATL 39"), since the agenda has no band. */
export const AgendaDayLabel = ({ view, date }: AgendaDayLabelProps) => {
  const isToday = date === view.today;
  const dayLoad = view.loadByDate.get(date);

  return (
    <span className={`w-14 shrink-0 text-xs ${isToday ? 'font-semibold text-ink' : 'text-ink-3'}`}>
      {weekdayAndDay(date)}
      {dayLoad && (
        <span className="mt-0.5 block font-normal text-ink-3" title={dayLoadText(dayLoad, view.background)}>
          <span aria-hidden style={{ color: dayLoadColor(dayLoad, view.background) }}>
            {dayLoadIcon(dayLoad)}
          </span>{' '}
          {measureAbbreviation(view.background)} {Math.round(dayLoad.value)}
        </span>
      )}
    </span>
  );
};
