const DAYS_TO_THURSDAY = 3;

/**
 * The "YYYY-MM" month a Monday-start week belongs to. A week that spans two months goes to the
 * one holding most of its days, which is the month of its Thursday (the ISO week rule).
 */
export const weekMonth = (weekStart: string): string => {
  const [year, month, day] = weekStart.split('-').map(Number);
  const thursday = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + DAYS_TO_THURSDAY));
  return thursday.toISOString().slice(0, 7);
};
