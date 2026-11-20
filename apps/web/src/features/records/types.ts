import type { RecordsResponse } from '@/shared/api/client';

/** All records for one period (all time or a year). */
export type RecordsScope = NonNullable<RecordsResponse['scope']>;

/** One podium entry: the ride (or climb) it came from, its date and value. */
export type RecordEntry = RecordsScope['maxSpeed'][number];

export type Streak = RecordsScope['streaks']['days'];
