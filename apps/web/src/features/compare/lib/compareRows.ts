import { rideTimeS } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import {
  formatCadence,
  formatCalories,
  formatClock,
  formatDistance,
  formatElevation,
  formatHeartRate,
  formatPower,
  formatSpeed,
  formatTss,
} from '@/shared/lib/formatters';

/** One row of the side-by-side table: the value, its formatting, and how to show the difference B − A. */
export type CompareRow = {
  label: string;
  value: (ride: Activity) => number | null;
  format: (value: number) => string;
  /** Formats the size of the difference; the sign is added in front. */
  formatDifference: (size: number) => string;
};

const rounded = (unit: string) => (size: number) => `${Math.round(size)}${unit}`;

const avgSpeed = (ride: Activity) => {
  const seconds = rideTimeS(ride);
  if (!ride.distanceM || !seconds) return null;
  return ride.distanceM / seconds;
};

export const COMPARE_ROWS: readonly CompareRow[] = [
  { label: 'Moving time', value: rideTimeS, format: formatClock, formatDifference: formatClock },
  {
    label: 'Distance',
    value: (ride) => ride.distanceM,
    format: (metres) => formatDistance(metres, 2),
    formatDifference: (metres) => formatDistance(metres, 2),
  },
  {
    label: 'Avg speed',
    value: avgSpeed,
    format: formatSpeed,
    formatDifference: (metresPerSecond) => `${(metresPerSecond * 3.6).toFixed(1)} km/h`,
  },
  {
    label: 'Elevation gain',
    value: (ride) => (ride.isIndoor ? null : ride.elevationGainM),
    format: formatElevation,
    formatDifference: rounded(' m'),
  },
  {
    label: 'Avg power',
    value: (ride) => (ride.hasPower ? ride.avgPower : null),
    format: formatPower,
    formatDifference: rounded(' W'),
  },
  { label: 'NP', value: (ride) => ride.metrics?.np ?? null, format: formatPower, formatDifference: rounded(' W') },
  { label: 'Avg heart rate', value: (ride) => ride.avgHr, format: formatHeartRate, formatDifference: rounded(' bpm') },
  { label: 'Max heart rate', value: (ride) => ride.maxHr, format: formatHeartRate, formatDifference: rounded(' bpm') },
  {
    label: 'Avg cadence',
    value: (ride) => (ride.isCycling ? ride.avgCadence : null),
    format: formatCadence,
    formatDifference: rounded(' rpm'),
  },
  { label: 'TSS', value: (ride) => ride.load?.tss ?? null, format: formatTss, formatDifference: rounded('') },
  {
    label: 'Active calories',
    value: (ride) => ride.activeCalories,
    format: formatCalories,
    formatDifference: rounded(' kcal'),
  },
];

/** The rows where at least one of the rides has a value. */
export const visibleRows = (a: Activity, b: Activity): CompareRow[] =>
  COMPARE_ROWS.filter((row) => row.value(a) !== null || row.value(b) !== null);

/** One ride's formatted value, or null when it has none. */
export const formattedValue = (row: CompareRow, ride: Activity): string | null => {
  const value = row.value(ride);
  return value === null ? null : row.format(value);
};

/** "+3:20", "−12 W"; null unless both rides have a value. */
export const formattedDifference = (row: CompareRow, a: Activity, b: Activity): string | null => {
  const valueA = row.value(a);
  const valueB = row.value(b);
  if (valueA === null || valueB === null) return null;
  const difference = valueB - valueA;
  const sign = difference >= 0 ? '+' : '−';
  return `${sign}${row.formatDifference(Math.abs(difference))}`;
};
