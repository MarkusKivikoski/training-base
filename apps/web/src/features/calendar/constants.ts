import type { LoadStatus } from '@app/metrics';
import type { Background } from './search';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Activities fetched for the visible weeks. */
export const ACTIVITY_LIMIT = 1000;

export const BACKGROUND_OPTIONS: ReadonlyArray<{ value: Background; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'fitness', label: 'Fitness' },
];

/** Zone colours (status tokens); neutral zones in muted ink. */
export const STATUS_COLOR: Record<LoadStatus, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  neutral: 'var(--text-muted)',
};

export const STATUS_ICON: Record<LoadStatus, string> = {
  good: '✓',
  warning: '▲',
  serious: '!',
  critical: '✕',
  neutral: '•',
};

/** Share of the row height the month's peak value reaches, so activity text stays readable. */
export const BAND_PEAK_HEIGHT = 0.65;
