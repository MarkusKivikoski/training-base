import type { SortKey } from '../../lib/climbList';

type SortButtonProps = {
  sortKey: SortKey;
  current: SortKey;
  label: string;
  onSort: (key: SortKey) => void;
};

/** A column heading that sorts the table by its column (always descending). */
export const SortButton = ({ sortKey, current, label, onSort }: SortButtonProps) => {
  const isActive = sortKey === current;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`hover:text-ink ${isActive ? 'font-semibold text-ink' : ''}`}
    >
      {label}
      {isActive ? ' ↓' : ''}
    </button>
  );
};
