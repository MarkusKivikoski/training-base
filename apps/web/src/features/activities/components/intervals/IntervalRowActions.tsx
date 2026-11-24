type IntervalRowActionsProps = {
  /** The interval's number in the table. */
  number: number;
  isDisabled: boolean;
  onTrim: () => void;
  onRemove: () => void;
};

const ACTION_CLASS = 'rounded-md px-1.5 py-0.5 hover:bg-surface-0 disabled:pointer-events-none disabled:opacity-40';

/** Trim and remove buttons at the end of an interval's row. */
export const IntervalRowActions = ({ number, isDisabled, onTrim, onRemove }: IntervalRowActionsProps) => (
  <span className="inline-flex items-center gap-1">
    <button
      type="button"
      disabled={isDisabled}
      onClick={onTrim}
      aria-label={`Trim interval ${number}`}
      className={`${ACTION_CLASS} text-xs text-ink-2 hover:text-ink`}
    >
      Trim
    </button>
    <button
      type="button"
      disabled={isDisabled}
      onClick={onRemove}
      aria-label={`Remove interval ${number}`}
      title="Remove"
      className={`${ACTION_CLASS} text-base leading-none text-ink-3 hover:text-status-critical`}
    >
      ×
    </button>
  </span>
);
