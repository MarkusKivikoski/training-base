import { formatMonthLong } from '@/shared/lib/formatters';
import type { MonthView } from '../../hooks/useCalendarMonth';
import { CopyMonthSummaryButton } from '../CopyMonthSummaryButton';
import { MonthTotalsText } from '../MonthTotalsText';
import { AddPlanButton } from '../plan/AddPlanButton';
import { AgendaWeek } from './AgendaWeek';

type MonthAgendaProps = {
  view: MonthView;
  /** The Monday of a week to highlight briefly. */
  highlightedWeek?: string | undefined;
};

/** The first day of the month that can still be planned, or null for a past month. */
const firstPlannableDay = (view: MonthView): string | null => {
  const lastDay = view.weeks
    .flat()
    .filter((date) => date.startsWith(view.month))
    .at(-1)!;
  if (lastDay < view.today) return null;
  const firstDay = `${view.month}-01`;
  return firstDay > view.today ? firstDay : view.today;
};

/** Mobile: the month's totals, then an agenda by week with empty days left out. */
export const MonthAgenda = ({ view, highlightedWeek }: MonthAgendaProps) => {
  const planFrom = firstPlannableDay(view);

  return (
    <div className="space-y-4 md:hidden">
      {planFrom && (
        <div className="flex justify-end">
          <AddPlanButton date={planFrom} withLabel />
        </div>
      )}
      {view.hasActivities && (
        <section className="rounded-xl border border-line bg-surface-1 p-3 text-sm">
          <h2 className="mb-1 text-xs font-medium text-ink-2">{formatMonthLong(view.month)} total</h2>
          <MonthTotalsText totals={view.monthTotals} />
          <div className="mt-3">
            <CopyMonthSummaryButton view={view} />
          </div>
        </section>
      )}
      {view.weeks.map((week) => (
        <AgendaWeek key={week[0]} view={view} week={week} isHighlighted={week[0] === highlightedWeek} />
      ))}
    </div>
  );
};
