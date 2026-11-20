import type { ActivitySortColumn, SortOrder } from '@/shared/api/client';
import { DEFAULT_SORT, SORT_COLUMNS } from '../constants';
import type { ActivitySearch, ActivitySearchPatch } from '../search';

export type ActivitySortState = { column: ActivitySortColumn; order: SortOrder };

/** The sort the URL asks for: newest first when it names none. */
export const currentSort = (search: ActivitySearch): ActivitySortState => ({
  column: search.sort ?? DEFAULT_SORT.column,
  order: search.order ?? DEFAULT_SORT.order,
});

const firstOrder = (column: ActivitySortColumn): SortOrder =>
  SORT_COLUMNS.find((option) => option.value === column)?.firstOrder ?? 'desc';

/** The URL change that sorts in `next`; the default sort leaves the URL. */
export const sortSearchPatch = (next: ActivitySortState): ActivitySearchPatch => ({
  sort: next.column === DEFAULT_SORT.column ? undefined : next.column,
  order: next.order === DEFAULT_SORT.order ? undefined : next.order,
});

/**
 * Clicking a column heading: the sorted column flips direction, another column starts in its
 * natural direction (biggest first for numbers, A–Z for names).
 */
export const sortAfterClick = (current: ActivitySortState, column: ActivitySortColumn): ActivitySortState => {
  if (current.column !== column) return { column, order: firstOrder(column) };
  const flipped: SortOrder = current.order === 'asc' ? 'desc' : 'asc';
  return { column, order: flipped };
};
