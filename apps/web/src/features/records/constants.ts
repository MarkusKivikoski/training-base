import { formatDate, formatDistance, formatElevation, formatHours, formatMonth } from '@/shared/lib/formatters';

export const RANK_LABELS = ['1st', '2nd', '3rd'] as const;

/** The periods of "Biggest periods", and how a period's start date is named. */
export const PERIOD_KINDS = [
  { key: 'week', label: 'Week', name: (date: string) => `Week of ${formatDate(date)}` },
  { key: 'month', label: 'Month', name: (date: string) => formatMonth(date) },
  { key: 'year', label: 'Year', name: (date: string) => date },
] as const;

/** The measures compared per period, besides the number of rides or runs. */
export const PERIOD_MEASURES = [
  { key: 'hours', label: 'Moving time', format: (hours: number) => formatHours(hours * 3600) },
  { key: 'distanceKm', label: 'Distance', format: (km: number) => formatDistance(km * 1000, 0) },
  { key: 'elevationM', label: 'Elevation', format: (metres: number) => formatElevation(metres) },
] as const;
