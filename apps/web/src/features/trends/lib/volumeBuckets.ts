import type { Trends } from '@/shared/api/client';
import { formatMonth } from '@/shared/lib/formatters';
import type { VolumeMetric } from './volumeMetrics';

type Month = Trends['months'][number];

export type Granularity = 'month' | 'year';

export type VolumeBucket = {
  key: string;
  label: string;
  indoorS: number;
  outdoorS: number;
  distanceM: number;
  elevationGainM: number;
  rides: number;
  strengthSessions: number;
};

const emptyYear = (year: string): VolumeBucket => ({
  key: year,
  label: year,
  indoorS: 0,
  outdoorS: 0,
  distanceM: 0,
  elevationGainM: 0,
  rides: 0,
  strengthSessions: 0,
});

/** Months as they are, or summed per calendar year (display grouping only). */
export const volumeBuckets = (months: readonly Month[], granularity: Granularity): VolumeBucket[] => {
  if (granularity === 'month') {
    return months.map((month) => ({ ...month, key: month.month, label: formatMonth(month.month) }));
  }

  const byYear = new Map<string, VolumeBucket>();
  for (const month of months) {
    const year = month.month.slice(0, 4);
    const bucket = byYear.get(year) ?? emptyYear(year);
    bucket.indoorS += month.indoorS;
    bucket.outdoorS += month.outdoorS;
    bucket.distanceM += month.distanceM;
    bucket.elevationGainM += month.elevationGainM;
    bucket.rides += month.rides;
    bucket.strengthSessions += month.strengthSessions;
    byYear.set(year, bucket);
  }
  return [...byYear.values()];
};

/** Seconds as hours with one decimal. */
export const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

/** A bucket's value of a non-hours measure, rounded for the bars. */
export const bucketValue = (bucket: VolumeBucket, metric: Exclude<VolumeMetric, 'hours'>): number => {
  if (metric === 'distanceKm') return Math.round(bucket.distanceM / 1000);
  if (metric === 'elevationM') return Math.round(bucket.elevationGainM);
  return bucket.rides;
};
