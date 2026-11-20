import type { MonthView } from '../../hooks/useCalendarMonth';
import { activitiesOn } from '../../lib/calendarDays';
import { dayLoadColor, weekBand } from '../../lib/dayLoad';
import { planProgress } from '../../lib/planMatching';
import { upcomingPlannedTss } from '../../lib/planTotals';
import { CalendarLoadBand } from './CalendarLoadBand';
import { DayCell } from './DayCell';
import { CopyWeekSummaryButton } from '../CopyWeekSummaryButton';
import { WeekHighlight } from '../WeekHighlight';
import { WeekTotalsCell } from './WeekTotalsCell';

type WeekRowProps = {
  view: MonthView;
  /** Monday to Sunday. */
  week: string[];
  /** Flash a highlight over the week (opened from another page). */
  isHighlighted: boolean;
};

/** One week of the grid: the load band behind seven day cells, then the week's totals. */
export const WeekRow = ({ view, week, isHighlighted }: WeekRowProps) => {
  const showsBand = view.background !== 'off';

  return (
    <div className="relative grid min-h-28 grid-cols-[repeat(7,minmax(0,1fr))_7.5rem] border-b border-line last:border-b-0">
      {showsBand && (
        <div className="absolute inset-y-0 left-0 right-[7.5rem]">
          <CalendarLoadBand
            slices={weekBand(week, view.loadByDate, view.peak)}
            colors={week.map((date) => dayLoadColor(view.loadByDate.get(date), view.background))}
          />
        </div>
      )}
      {week.map((date) => (
        <DayCell key={date} view={view} date={date} />
      ))}
      <WeekTotalsCell
        activities={activitiesOn(week, view.activitiesByDate)}
        plannedTss={upcomingPlannedTss(week, view.plannedByDate, view.presets, view.today)}
        progress={planProgress(week.flatMap((date) => view.matchesByDate.get(date) ?? []))}
        action={<CopyWeekSummaryButton view={view} week={week} />}
      />
      {isHighlighted && <WeekHighlight />}
    </div>
  );
};
