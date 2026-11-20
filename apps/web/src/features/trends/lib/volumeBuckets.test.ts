import { describe, expect, it } from 'vitest';
import type { Trends } from '@/shared/api/client';
import { bucketValue, toHours, volumeBuckets } from './volumeBuckets';

type Month = Trends['months'][number];

const month = (key: string, o: Partial<Month> = {}) =>
  ({
    month: key,
    indoorS: 3600,
    outdoorS: 7200,
    distanceM: 60400,
    elevationGainM: 410.4,
    rides: 3,
    strengthSessions: 1,
    ...o,
  }) as Month;

describe('volume buckets', () => {
  it('keeps months and sums years', () => {
    const months = [month('2025-12'), month('2026-01'), month('2026-02', { rides: 1 })];
    expect(volumeBuckets(months, 'month').map((b) => b.key)).toEqual(['2025-12', '2026-01', '2026-02']);
    const years = volumeBuckets(months, 'year');
    expect(years.map((b) => [b.key, b.rides, b.indoorS, b.strengthSessions])).toEqual([
      ['2025', 3, 3600, 1],
      ['2026', 4, 7200, 2],
    ]);
  });

  it('rounds values for the bars', () => {
    const bucket = volumeBuckets([month('2026-01')], 'month')[0]!;
    expect(bucketValue(bucket, 'distanceKm')).toBe(60);
    expect(bucketValue(bucket, 'elevationM')).toBe(410);
    expect(bucketValue(bucket, 'rides')).toBe(3);
    expect(toHours(5400)).toBe(1.5);
  });
});
