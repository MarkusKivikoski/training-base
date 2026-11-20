import { useState } from 'react';
import { applyThemeChoice, readThemeChoice, type ThemeChoice } from '@/shared/lib/theme';
import { Toggle } from '@/shared/ui/Toggle';

const THEME_ORDER: ThemeChoice[] = ['auto', 'light', 'dark'];
const THEME_LABEL: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };
const THEME_ICON: Record<ThemeChoice, string> = { auto: '◐', light: '☀', dark: '☾' };

type ThemeToggleProps = {
  /** A single button that cycles through the choices (mobile header). */
  compact?: boolean;
};

/** Auto / Light / Dark theme choice, remembered in this browser. */
export const ThemeToggle = ({ compact = false }: ThemeToggleProps) => {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);

  const choose = (next: ThemeChoice) => {
    applyThemeChoice(next);
    setChoice(next);
  };

  if (compact) {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length]!;
    return (
      <button
        type="button"
        onClick={() => choose(next)}
        aria-label={`Theme: ${THEME_LABEL[choice]}. Switch to ${THEME_LABEL[next]}.`}
        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-2 hover:text-ink"
      >
        <span aria-hidden>{THEME_ICON[choice]}</span> {THEME_LABEL[choice]}
      </button>
    );
  }

  return (
    <Toggle
      label="Theme"
      value={choice}
      onChange={choose}
      options={THEME_ORDER.map((value) => ({ value, label: THEME_LABEL[value] }))}
    />
  );
};
