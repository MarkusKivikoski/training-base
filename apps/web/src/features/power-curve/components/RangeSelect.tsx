import { PRESETS } from '../constants';

type RangeSelectProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  /** Adds a "None" option (value "none"). */
  allowNone?: boolean;
};

/** A menu of the date-range presets. */
export const RangeSelect = <T extends string>({ label, value, onChange, allowNone = false }: RangeSelectProps<T>) => (
  <label className="flex items-center gap-2 text-sm text-ink-2">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="rounded-lg border border-line bg-surface-1 px-2 py-1 text-sm text-ink"
    >
      {allowNone && <option value="none">None</option>}
      {PRESETS.map((preset) => (
        <option key={preset.value} value={preset.value}>
          {preset.label}
        </option>
      ))}
    </select>
  </label>
);
