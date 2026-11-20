import type { WeekTotals } from '@app/metrics';
import { formatDistance, formatDuration, formatElevation, formatShortDate, formatTss } from '@/shared/lib/formatters';

export type TotalPart = { label: string; value: string };

/** Month totals as labelled figures: riding time, outdoor distance and climbing, rides, TSS, gym sessions, other activities. */
export const monthTotalParts = (totals: WeekTotals): TotalPart[] => {
  const parts: TotalPart[] = [];
  if (totals.rides > 0) parts.push({ label: 'riding', value: formatDuration(totals.movingS) });
  if (totals.outdoorDistanceM > 0) parts.push({ label: 'outdoors', value: formatDistance(totals.outdoorDistanceM, 0) });
  if (totals.outdoorElevationM > 0) parts.push({ label: 'climbed', value: formatElevation(totals.outdoorElevationM) });
  parts.push({ label: totals.rides === 1 ? 'ride' : 'rides', value: String(totals.rides) });
  if (totals.tss > 0) parts.push({ label: 'TSS', value: formatTss(totals.tss) });
  if (totals.gymSessions > 0) {
    parts.push({ label: totals.gymSessions === 1 ? 'gym session' : 'gym sessions', value: String(totals.gymSessions) });
  }
  if (totals.otherActivities > 0) {
    const label = totals.otherActivities === 1 ? 'other activity' : 'other activities';
    parts.push({ label, value: String(totals.otherActivities) });
  }
  return parts;
};

/** "Week of 2.11. · 4 h 10 min · 82 km · TSS 240 · 2 gym" for the mobile agenda. */
export const agendaWeekTitle = (monday: string, totals: WeekTotals): string => {
  let title = `Week of ${formatShortDate(monday)}`;
  if (totals.rides > 0) title += ` · ${formatDuration(totals.movingS)}`;
  if (totals.outdoorDistanceM > 0) title += ` · ${formatDistance(totals.outdoorDistanceM, 0)}`;
  if (totals.tss > 0) title += ` · TSS ${formatTss(totals.tss)}`;
  if (totals.gymSessions > 0) title += ` · ${totals.gymSessions} gym`;
  return title;
};
