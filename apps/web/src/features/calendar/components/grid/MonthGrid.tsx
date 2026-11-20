import { formatMonthLong } from '@/shared/lib/formatters';
import { WEEKDAYS } from '../../constants';
import type { MonthView } from '../../hooks/useCalendarMonth';
import { CopyMonthSummaryButton } from '../CopyMonthSummaryButton';
import { MonthTotalsText } from '../MonthTotalsText';
import { WeekRow } from './WeekRow';

type MonthGridProps = {
  view: MonthView;
  /** The Monday of a week to highlight briefly. */
  highlightedWeek?: string | undefined;
};

/** Desktop: the month as a grid of weeks, with a weekly totals column and the month's totals below. */
export const MonthGrid = ({ view, highlightedWeek }: MonthGridProps) => (
  <div className="hidden overflow-hidden rounded-xl border border-line bg-surface-1 md:block">
    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_7.5rem] border-b border-line text-xs font-medium text-ink-2">
      {WEEKDAYS.map((weekday) => (
        <div key={weekday} className="px-2 py-2">
          {weekday}
        </div>
      ))}
      <div className="border-l border-line px-2 py-2">Week</div>
    </div>
    {view.weeks.map((week) => (
      <WeekRow key={week[0]} view={view} week={week} isHighlighted={week[0] === highlightedWeek} />
    ))}
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line bg-surface-0/40 px-3 py-2.5 text-sm">
      <span className="text-xs font-medium text-ink-2">{formatMonthLong(view.month)} total</span>
      <MonthTotalsText totals={view.monthTotals} />
      <span className="ml-auto">
        <CopyMonthSummaryButton view={view} />
      </span>
    </div>
  </div>
);
