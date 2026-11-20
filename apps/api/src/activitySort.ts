import { workoutTypeSchema, type ActivitySummary, type WorkoutType } from '@app/shared';
import { z } from 'zod';

/** Columns the Activities list can be sorted by. */
export const activitySortSchema = z.enum([
  'date',
  'name',
  'workoutType',
  'duration',
  'distance',
  'elevation',
  'hr',
  'power',
]);
export type ActivitySort = z.infer<typeof activitySortSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

type ListedActivity = ActivitySummary & { workoutTypeOverride: WorkoutType | null };

/** Workout types rank from easiest to hardest, in the order they are defined. */
const WORKOUT_TYPE_RANK = new Map(workoutTypeSchema.options.map((type, index) => [type, index]));

/** The value an activity is sorted on; null when it has none (e.g. no power meter). */
const sortValue = (activity: ListedActivity, sort: ActivitySort): number | string | null => {
  switch (sort) {
    case 'date':
      return activity.startTimeUtc;
    case 'name':
      return activity.name.toLocaleLowerCase();
    case 'workoutType': {
      const type = activity.workoutTypeOverride ?? activity.workoutType?.type;
      return type === undefined ? null : (WORKOUT_TYPE_RANK.get(type) ?? null);
    }
    case 'duration':
      return activity.durationS;
    case 'distance':
      // Trainer rides without a speed sensor record 0 m; the list shows that as empty, so it sorts so.
      return activity.distanceM !== null && activity.distanceM > 0 ? activity.distanceM : null;
    case 'elevation':
      // Indoor elevation is a trainer's guess, not climbing, so it sorts with the empty values.
      return activity.isIndoor ? null : activity.elevationGainM;
    case 'hr':
      return activity.avgHr;
    case 'power':
      return activity.avgPower;
  }
};

const compareValues = (first: number | string, second: number | string): number => {
  if (typeof first === 'string' && typeof second === 'string') return first.localeCompare(second);
  return Number(first) - Number(second);
};

/**
 * The activities sorted by one column. Activities without a value go last in either direction,
 * and ties keep newest first.
 */
export const sortActivities = <T extends ListedActivity>(
  activities: readonly T[],
  sort: ActivitySort,
  order: SortOrder,
): T[] => {
  const direction = order === 'asc' ? 1 : -1;
  const newestFirst = (first: T, second: T) => second.startTimeUtc.localeCompare(first.startTimeUtc);

  return [...activities].sort((first, second) => {
    const firstValue = sortValue(first, sort);
    const secondValue = sortValue(second, sort);
    if (firstValue === null && secondValue === null) return newestFirst(first, second);
    if (firstValue === null) return 1;
    if (secondValue === null) return -1;
    return direction * compareValues(firstValue, secondValue) || newestFirst(first, second);
  });
};
