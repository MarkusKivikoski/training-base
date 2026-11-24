import { useId, type KeyboardEvent } from 'react';
import { nudgedClock } from '../../lib/intervalEdits';

type ClockFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

const STEP_S = 1;
const BIG_STEP_S = 10;

const NUDGE_CLASS =
  'size-7 rounded-md border border-line text-sm leading-none text-ink-2 hover:bg-surface-0 hover:text-ink';

/**
 * A time into the ride (m:ss or h:mm:ss) with − / + buttons that step it by a second; ↑ and ↓ do
 * the same, by 10 s with Shift.
 */
export const ClockField = ({ label, value, onChange, autoFocus = false }: ClockFieldProps) => {
  const inputId = useId();
  const nudge = (stepS: number) => onChange(nudgedClock(value, stepS));

  const stepWithArrows = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = event.shiftKey ? BIG_STEP_S : STEP_S;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudge(step);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudge(-step);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => nudge(-STEP_S)}
          aria-label={`${label} 1 s earlier`}
          className={NUDGE_CLASS}
        >
          −
        </button>
        <input
          id={inputId}
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="m:ss"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={stepWithArrows}
          className="w-24 rounded-lg border border-line bg-surface-1 px-2 py-1 text-center text-sm tabular-nums text-ink"
        />
        <button type="button" onClick={() => nudge(STEP_S)} aria-label={`${label} 1 s later`} className={NUDGE_CLASS}>
          +
        </button>
      </div>
    </div>
  );
};
