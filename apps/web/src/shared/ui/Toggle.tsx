type ToggleProps<T extends string> = {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
};

const buttonClass = (isSelected: boolean) =>
  `rounded-md px-3 py-1 text-xs font-medium transition-colors ${
    isSelected ? 'bg-ink text-surface-1' : 'text-ink-2 hover:text-ink'
  }`;

/** A segmented control: exactly one option is selected. */
export const Toggle = <T extends string>({ value, options, onChange, label }: ToggleProps<T>) => (
  <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-lg border border-line p-0.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={buttonClass(value === option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
