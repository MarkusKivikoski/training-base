import { formatMonthLong } from '@/shared/lib/formatters';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import type { MonthView } from '../hooks/useCalendarMonth';
import { MonthAgenda } from './agenda/MonthAgenda';
import { CalendarLegend } from './CalendarLegend';
import { MonthGrid } from './grid/MonthGrid';
import { PlanEditorProvider } from './plan/PlanEditorProvider';

type CalendarMonthProps = {
  view: MonthView | null;
  isPending: boolean;
  error: Error | null;
  /** The Monday of a week to highlight briefly. */
  highlightedWeek?: string | undefined;
};

/** The month as a grid (desktop) or agenda (mobile), with the legend; or loading and error states. */
export const CalendarMonth = ({ view, isPending, error, highlightedWeek }: CalendarMonthProps) => {
  if (error) return <ErrorMessage error={error} />;
  if (isPending || !view) return <Loading />;

  return (
    <PlanEditorProvider presets={view.presets} today={view.today}>
      {!view.hasActivities && (
        <p className="mb-3 text-sm text-ink-3">No activities in {formatMonthLong(view.month)}.</p>
      )}
      <MonthGrid view={view} highlightedWeek={highlightedWeek} />
      <MonthAgenda view={view} highlightedWeek={highlightedWeek} />
      <CalendarLegend view={view} />
    </PlanEditorProvider>
  );
};
