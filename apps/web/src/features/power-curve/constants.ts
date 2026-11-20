export type Preset = 'last42' | 'last90' | 'year' | 'all';

export type ComparePreset = Preset | 'none';

export const PRESETS: ReadonlyArray<{ value: Preset; label: string }> = [
  { value: 'last42', label: 'Last 42 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export const DEFAULT_PRESET: Preset = 'last90';

/** Durations (seconds) labelled on the log x-axis. */
export const AXIS_TICKS = [1, 5, 15, 60, 300, 1200, 3600, 7200];

/** The x-axis runs to two hours. */
export const MAX_DURATION_S = 7200;
