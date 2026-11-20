/** What's drawn behind the week rows. */
export type Background = 'off' | 'fatigue' | 'fitness';

/**
 * Calendar state in the URL. The current month and the fatigue background are the defaults,
 * so only other values appear. `week` (its Monday) is highlighted briefly when the page opens;
 * moving to another month or background drops it.
 */
export type CalendarSearch = { month?: string; bg?: 'off' | 'fitness'; week?: string };

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** The router's `validateSearch` for /calendar. */
export const validateCalendarSearch = (search: Record<string, unknown>): CalendarSearch => {
  const out: CalendarSearch = {};
  const month = search['month'];
  if (typeof month === 'string' && YEAR_MONTH.test(month)) out.month = month;
  const background = search['bg'];
  if (background === 'off' || background === 'fitness') out.bg = background;
  const week = search['week'];
  if (typeof week === 'string' && DATE.test(week)) out.week = week;
  return out;
};

/** The search for a month and background, leaving out the defaults. */
export const calendarSearch = (month: string, background: Background, currentMonth: string): CalendarSearch => {
  const out: CalendarSearch = {};
  if (month !== currentMonth) out.month = month;
  if (background !== 'fatigue') out.bg = background;
  return out;
};
