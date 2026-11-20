import type { ComponentUsage, TyreTotals } from '@/shared/lib/gear';
import { formatDistance, formatHours } from '@/shared/lib/formatters';

/** Distance in whole km; "0 km" rather than a dash for a freshly fitted part. */
const kmText = (metres: number) => (metres > 0 ? formatDistance(metres, 0) : '0 km');

/** "2,950 km of 3,000 km · 92.0 h of 150 h", or the plain usage for parts without an interval. */
export const usageText = ({ component, distanceM, movingS }: ComponentUsage): string => {
  const parts: string[] = [];
  if (component.intervalKm) parts.push(`${kmText(distanceM)} of ${formatDistance(component.intervalKm * 1000, 0)}`);
  if (component.intervalHours) parts.push(`${formatHours(movingS)} of ${component.intervalHours} h`);
  if (parts.length === 0) return `${kmText(distanceM)} · ${formatHours(movingS)}`;
  return parts.join(' · ');
};

/** Status words that go with the bar, so colour isn't the only signal. */
export const STATUS_TEXT = {
  ok: 'OK',
  soon: 'Soon',
  due: 'Due',
  untracked: 'No interval',
} as const;

/** Bar width 0–100 for a usage fraction. */
export const barPercent = (fraction: number | null): number => Math.min(1, fraction ?? 0) * 100;

/** "No rides", "1 ride", "12 rides". */
export const rideCountText = (count: number): string => {
  if (count === 0) return 'No rides';
  return count === 1 ? '1 ride' : `${count} rides`;
};

/** A set of tyres' use, like a component without an interval: "73 km · 2.5 h · 2 rides", or "No rides". */
export const tyreUsageText = (totals: TyreTotals | undefined): string => {
  if (!totals || totals.rides === 0) return rideCountText(0);
  return `${kmText(totals.distanceM)} · ${formatHours(totals.movingS)} · ${rideCountText(totals.rides)}`;
};
