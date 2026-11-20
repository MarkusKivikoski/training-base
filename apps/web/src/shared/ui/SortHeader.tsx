type SortHeaderProps = {
  label: string;
  /** Whether the table is sorted by this column. */
  isActive: boolean;
  order: 'asc' | 'desc';
  onClick: () => void;
};

const ARROWS = { asc: '↑', desc: '↓' } as const;

/** A column heading that sorts the table by its column; the sorted one shows its direction. */
export const SortHeader = ({ label, isActive, order, onClick }: SortHeaderProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`whitespace-nowrap hover:text-ink ${isActive ? 'font-semibold text-ink' : ''}`}
  >
    {label}
    {isActive && <span aria-hidden="true"> {ARROWS[order]}</span>}
  </button>
);
