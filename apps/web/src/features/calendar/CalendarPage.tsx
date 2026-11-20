import { getRouteApi } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useStatus } from '@/shared/api/status';
import { formatMonthLong } from '@/shared/lib/formatters';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { CalendarMonth } from './components/CalendarMonth';
import { MonthNav } from './components/MonthNav';
import { BACKGROUND_OPTIONS } from './constants';
import { useCalendarMonth } from './hooks/useCalendarMonth';
import { useMonthArrowKeys } from './hooks/useMonthArrowKeys';
import { calendarSearch, type Background } from './search';

const route = getRouteApi('/calendar');

/** A month of activities with weekly totals and fatigue or fitness drawn behind the weeks. */
export const CalendarPage = () => {
  const status = useStatus();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const today = status.data?.today;
  const currentMonth = today?.slice(0, 7);
  const month = search.month ?? currentMonth;
  const background: Background = search.bg ?? 'fatigue';
  const calendar = useCalendarMonth(month, today, background);

  const showMonth = useCallback(
    (next: string) => {
      if (!currentMonth) return;
      void navigate({ search: calendarSearch(next, background, currentMonth) });
    },
    [navigate, background, currentMonth],
  );
  const showBackground = (next: Background) => {
    if (!month || !currentMonth) return;
    void navigate({ search: calendarSearch(month, next, currentMonth) });
  };
  useMonthArrowKeys(month, showMonth);

  if (status.error) return <ErrorMessage error={status.error} />;
  if (!month || !currentMonth) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{formatMonthLong(month)}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            label="Calendar background"
            value={background}
            onChange={showBackground}
            options={BACKGROUND_OPTIONS}
          />
          <MonthNav month={month} currentMonth={currentMonth} onChange={showMonth} />
        </div>
      </div>
      <CalendarMonth
        view={calendar.view}
        isPending={calendar.isPending}
        error={calendar.error}
        highlightedWeek={search.week}
      />
    </div>
  );
};
