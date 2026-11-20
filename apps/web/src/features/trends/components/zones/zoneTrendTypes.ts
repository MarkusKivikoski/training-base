import type { Trends } from '@/shared/api/client';

export type ZoneChannel = 'power' | 'hr';
export type ZonePeriod = 'week' | 'month';

/** One week or month of zone time. */
export type ZonePeriodRow = Trends['zones']['weeks'][number];

/** Weeks shown when grouping by week. */
export const WEEKS_SHOWN = 26;

export const channelName = (channel: ZoneChannel) => (channel === 'power' ? 'power' : 'heart-rate');
