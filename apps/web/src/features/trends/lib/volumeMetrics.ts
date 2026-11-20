import type { VolumeMetric, YearMetric } from '@app/metrics';
import { formatDistance, formatElevation, formatHours } from '@/shared/lib/formatters';

export type { VolumeMetric, YearMetric };

export type MetricInfo = {
  /** Toggle label. */
  label: string;
  /** Unit on the axis ('' for counts). */
  axisUnit: string;
  title: string;
  format: (value: number) => string;
  /** Compact form for end labels and tables. */
  short: (value: number) => string;
};

/** Display details of each volume metric, shared by the volume and year-over-year cards. */
export const VOLUME_METRIC_INFO: Record<VolumeMetric, MetricInfo> = {
  hours: {
    label: 'Hours',
    axisUnit: 'h',
    title: 'Moving time',
    format: (hours) => formatHours(hours * 3600),
    short: (hours) => `${Math.round(hours)} h`,
  },
  distanceKm: {
    label: 'Distance',
    axisUnit: 'km',
    title: 'Outdoor distance',
    format: (km) => formatDistance(km * 1000, 0),
    short: (km) => formatDistance(km * 1000, 0),
  },
  elevationM: {
    label: 'Elevation',
    axisUnit: 'm',
    title: 'Outdoor elevation gain',
    format: (metres) => formatElevation(metres),
    short: (metres) => formatElevation(metres),
  },
  rides: {
    label: 'Rides',
    axisUnit: '',
    title: 'Rides',
    format: (count) => `${count} ${count === 1 ? 'ride' : 'rides'}`,
    short: (count) => String(count),
  },
};

export const VOLUME_METRIC_ORDER: readonly VolumeMetric[] = ['hours', 'distanceKm', 'elevationM', 'rides'];

/** Year-over-year measures: the riding ones plus gym workouts (strength training sessions). */
export const YEAR_METRIC_INFO: Record<YearMetric, MetricInfo> = {
  ...VOLUME_METRIC_INFO,
  gym: {
    label: 'Gym',
    axisUnit: '',
    title: 'Gym workouts',
    format: (count) => `${count} ${count === 1 ? 'workout' : 'workouts'}`,
    short: (count) => String(count),
  },
};
