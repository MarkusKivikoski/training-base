import { CopyButton } from '@/shared/ui/CopyButton';
import type { MonthView } from '../hooks/useCalendarMonth';
import { activitiesOn, isInMonth } from '../lib/calendarDays';
import { monthSummaryText, type SummaryWeek } from '../lib/loadSummaryText';

type CopyMonthSummaryButtonProps = {
  view: MonthView;
};

/** Copies the month's hours, TSS and Z1–Z2 share, with a line per week, for a coaching chat. */
export const CopyMonthSummaryButton = ({ view }: CopyMonthSummaryButtonProps) => {
  const getText = () => {
    // Weeks that haven't started would read as "no rides", as if training had been missed.
    const startedWeeks = view.weeks.filter((week) => week[0]! <= view.today);
    const weeks: SummaryWeek[] = startedWeeks.map((week) => {
      const datesInMonth = week.filter((date) => isInMonth(date, view.month));
      return { monday: week[0]!, activities: activitiesOn(datesInMonth, view.activitiesByDate) };
    });
    return monthSummaryText(view.month, weeks, view.today);
  };

  return (
    <CopyButton
      getText={getText}
      label="Copy month summary"
      dialogTitle="Month summary"
      title="Copy the month's load for a coaching chat"
    />
  );
};
