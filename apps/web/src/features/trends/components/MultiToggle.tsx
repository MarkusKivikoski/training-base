type MultiToggleProps<T extends string> = {
  values: readonly T[];
  options: ReadonlyArray<{ value: T; label: string }>;
  /** The selected values, in option order. */
  onChange: (values: T[]) => void;
  /** Accessible name of the group. */
  label: string;
};

const buttonClass = (isSelected: boolean) =>
  `rounded-md px-3 py-1 text-xs font-medium transition-colors ${
    isSelected ? 'bg-ink text-surface-1' : 'text-ink-2 hover:text-ink'
  }`;

/**
 * Like Toggle, but any number of options can be on. At least one always stays selected:
 * clicking the only selected option does nothing.
 */
export const MultiToggle = <T extends string>({ values, options, onChange, label }: MultiToggleProps<T>) => {
  const toggle = (value: T) => {
    const isSelected = values.includes(value);
    const isLastSelected = isSelected && values.length === 1;
    if (isLastSelected) return;

    const next = new Set(values);
    if (isSelected) next.delete(value);
    else next.add(value);
    onChange(options.map((option) => option.value).filter((optionValue) => next.has(optionValue)));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap rounded-lg border border-line p-0.5"
    >
      {options.map((option) => {
        const isSelected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(option.value)}
            className={buttonClass(isSelected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
