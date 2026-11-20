import type { ActivitySortColumn, SortOrder } from '@/shared/api/client';

/** Activities fetched per page while scrolling. */
export const PAGE_SIZE = 100;

/** The next page starts loading when the end of the list is this close to the viewport. */
export const INFINITE_SCROLL_MARGIN = '600px';

/** Sortable columns, with the direction a first click on each sorts in. */
export const SORT_COLUMNS: ReadonlyArray<{ value: ActivitySortColumn; label: string; firstOrder: SortOrder }> = [
  { value: 'date', label: 'Date', firstOrder: 'desc' },
  { value: 'name', label: 'Name', firstOrder: 'asc' },
  { value: 'workoutType', label: 'Type', firstOrder: 'desc' },
  { value: 'duration', label: 'Duration', firstOrder: 'desc' },
  { value: 'distance', label: 'Distance', firstOrder: 'desc' },
  { value: 'elevation', label: 'Elevation', firstOrder: 'desc' },
  { value: 'hr', label: 'Avg HR', firstOrder: 'desc' },
  { value: 'power', label: 'Avg power', firstOrder: 'desc' },
];

/** Newest first, which the URL leaves out. */
export const DEFAULT_SORT: { column: ActivitySortColumn; order: SortOrder } = { column: 'date', order: 'desc' };

/** Best efforts shown on the ride page's power card, in seconds. */
export const BEST_EFFORTS_S = [5, 60, 300, 1200] as const;

export type SportScope = 'cycling' | 'all';

export const SPORT_OPTIONS: ReadonlyArray<{ value: SportScope; label: string }> = [
  { value: 'cycling', label: 'Cycling' },
  { value: 'all', label: 'All types' },
];

export type EnvironmentChoice = 'both' | 'indoor' | 'outdoor';

export const ENVIRONMENT_OPTIONS: ReadonlyArray<{ value: EnvironmentChoice; label: string }> = [
  { value: 'both', label: 'Both' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
];

/** Shared look of the filter inputs. */
export const FILTER_FIELD_CLASS = 'rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink';

/** The past-efforts chart is drawn from this many efforts on; with fewer, the table says it all. */
export const MIN_EFFORTS_FOR_CHART = 3;
