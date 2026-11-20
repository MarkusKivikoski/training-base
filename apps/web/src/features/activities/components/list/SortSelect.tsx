import type { ActivitySortColumn } from '@/shared/api/client';
import { FILTER_FIELD_CLASS, SORT_COLUMNS } from '../../constants';
import { sortAfterClick, type ActivitySortState } from '../../lib/activitySort';

type SortSelectProps = {
  sort: ActivitySortState;
  onChange: (next: ActivitySortState) => void;
};

const ORDER_LABELS = { asc: '↑', desc: '↓' } as const;

/** Sort column and direction for phones, where the list has no column headings. */
export const SortSelect = ({ sort, onChange }: SortSelectProps) => {
  const flippedOrder = sort.order === 'asc' ? 'desc' : 'asc';

  return (
    <div className="flex items-center gap-1 md:hidden">
      <label className="sr-only" htmlFor="activity-sort">
        Sort by
      </label>
      <select
        id="activity-sort"
        value={sort.column}
        onChange={(event) => onChange(sortAfterClick(sort, event.target.value as ActivitySortColumn))}
        className={FILTER_FIELD_CLASS}
      >
        {SORT_COLUMNS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={sort.order === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'}
        onClick={() => onChange({ column: sort.column, order: flippedOrder })}
        className={FILTER_FIELD_CLASS}
      >
        {ORDER_LABELS[sort.order]}
      </button>
    </div>
  );
};
