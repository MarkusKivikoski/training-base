import { addDays } from '@app/metrics';
import { RANGE_PRESETS } from '../constants';

const DATE_INPUT_CLASS = 'rounded-md border border-line bg-surface-1 px-1.5 py-1 text-xs text-ink';

type RangeControlsProps = {
  from: string | undefined;
  to: string | undefined;
  today: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
};

/** From and To dates, plus quick ranges ending today. */
export const RangeControls = ({ from, to, today, onChange }: RangeControlsProps) => (
  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
    <label className="flex items-center gap-1">
      From
      <input
        type="date"
        value={from ?? ''}
        max={to ?? today}
        onChange={(event) => onChange(event.target.value || undefined, to)}
        className={DATE_INPUT_CLASS}
      />
    </label>
    <label className="flex items-center gap-1">
      To
      <input
        type="date"
        value={to ?? ''}
        min={from}
        max={today}
        onChange={(event) => onChange(from, event.target.value || undefined)}
        className={DATE_INPUT_CLASS}
      />
    </label>
    {RANGE_PRESETS.map((preset) => {
      const presetFrom = addDays(today, -(preset.days - 1));
      const isActive = from === presetFrom && to === today;
      return (
        <button
          key={preset.days}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(presetFrom, today)}
          className={`rounded-md px-2 py-1 ${isActive ? 'bg-ink font-medium text-surface-1' : 'border border-line hover:text-ink'}`}
        >
          {preset.label}
        </button>
      );
    })}
  </div>
);
