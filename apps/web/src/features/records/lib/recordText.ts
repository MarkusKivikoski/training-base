import { addDays } from '@app/metrics';
import { formatDate, formatDistance, formatElevation, formatGrade } from '@/shared/lib/formatters';
import type { RecordEntry, Streak } from '../types';

/** A climb's length: metres under 1 km, else km with two decimals. */
export const climbLength = (metres: number): string => (metres < 1000 ? `${metres} m` : formatDistance(metres, 2));

/** "12.4 m/km". */
export const hillinessText = (metresPerKm: number): string =>
  `${metresPerKm.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m/km`;

/** Longest climb's detail (`extra` is its gain): "84 m at 5.2%". */
export const longestClimbDetail = (entry: RecordEntry): string => {
  const gainM = entry.extra ?? 0;
  return `${formatElevation(gainM)} at ${formatGrade(gainM / entry.value)}`;
};

/** Biggest gain's detail (`extra` is the climb's length): "1.62 km at 5.2%". */
export const biggestGainDetail = (entry: RecordEntry): string => {
  const lengthM = entry.extra ?? 0;
  return `${climbLength(lengthM)} at ${formatGrade(entry.value / lengthM)}`;
};

/** "12 days". */
export const breakLength = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'}`;

/** The days without a ride before the ride that ended the break: "1.3.2026 – 12.3.2026, back with". */
export const breakDetail = (entry: RecordEntry): string => {
  const firstDayOff = addDays(entry.date, -entry.value);
  const lastDayOff = addDays(entry.date, -1);
  return `${formatDate(firstDayOff)} – ${formatDate(lastDayOff)}, back with`;
};

/** "5 days", "1 week", or a dash without a streak. */
export const streakLength = (streak: Streak, unit: 'day' | 'week'): string => {
  if (!streak) return '—';
  const plural = streak.length === 1 ? '' : 's';
  return `${streak.length} ${unit}${plural}`;
};

/** When the streak ran: a single day or week, or a range ("Weeks of 2.3.2026 – 16.3.2026"). */
export const streakDates = (streak: NonNullable<Streak>, isWeeks: boolean): string => {
  if (streak.length === 1) return isWeeks ? `Week of ${formatDate(streak.from)}` : formatDate(streak.from);
  const prefix = isWeeks ? 'Weeks of ' : '';
  return `${prefix}${formatDate(streak.from)} – ${formatDate(streak.to)}`;
};
