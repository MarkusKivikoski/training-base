import { CopyButton } from '@/shared/ui/CopyButton';
import type { MonthView } from '../hooks/useCalendarMonth';
import { activitiesOn } from '../lib/calendarDays';
import { weekSummaryText } from '../lib/loadSummaryText';

type CopyWeekSummaryButtonProps = {
  view: MonthView;
  /** Monday to Sunday; the whole week counts, also days outside the month. */
  week: string[];
};

/** Copies the week's hours, TSS and Z1–Z2 share for a coaching chat. */
export const CopyWeekSummaryButton = ({ view, week }: CopyWeekSummaryButtonProps) => (
  <CopyButton
    getText={() => weekSummaryText(week[0]!, week[6]!, activitiesOn(week, view.activitiesByDate))}
    label="Copy week summary"
    dialogTitle="Week summary"
    title="Copy the week's load for a coaching chat"
    compact
  />
);
