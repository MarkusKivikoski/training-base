import type { HeatmapMode, HeatmapShow } from './search';

/** Quick ranges ending today, in days back (today included). */
export const RANGE_PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
] as const;

/** Choosing "Range…" starts with the last 90 days. */
export const DEFAULT_RANGE_DAYS = 90;

/** Whose routes the map shows; rides are the default. */
export const SHOW_OPTIONS: ReadonlyArray<{ value: HeatmapShow | 'cycling'; label: string }> = [
  { value: 'cycling', label: 'Rides' },
  { value: 'running', label: 'Runs' },
  { value: 'all', label: 'Both' },
];

export const MODE_OPTIONS: ReadonlyArray<{ value: HeatmapMode; label: string }> = [
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'solid', label: 'Solid' },
];
