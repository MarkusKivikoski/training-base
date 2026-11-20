/** Weeks shown in the Overview's weekly charts and tiles. */
export const WEEKS_SHOWN = 12;

export type FitnessRange = '6w' | '3m' | 'all';

/** Days shown for each fitness-chart range; null shows everything. */
export const FITNESS_RANGE_DAYS: Record<FitnessRange, number | null> = {
  '6w': 42,
  '3m': 91,
  all: null,
};

export const FITNESS_RANGE_OPTIONS: ReadonlyArray<{ value: FitnessRange; label: string }> = [
  { value: '6w', label: '6 weeks' },
  { value: '3m', label: '3 months' },
  { value: 'all', label: 'All' },
];

export const DEFAULT_FITNESS_RANGE: FitnessRange = '3m';

export type ChartView = 'chart' | 'table';

export const CHART_VIEW_OPTIONS: ReadonlyArray<{ value: ChartView; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

/** Most goals a user can have at once. */
export const MAX_GOALS = 12;

/** What the fitness, fatigue and form values mean, shown in their tooltips. */
export const LOAD_EXPLANATIONS = {
  ctl: 'Chronic training load: your average daily training stress (TSS) over about the last 6 weeks, with recent days counting most (a 42-day weighted average). It rises slowly with steady training and falls slowly when you stop. Higher means fitter.',
  atl: 'Acute training load: your average daily TSS over about the last week (a 7-day weighted average). It jumps after hard days and drops within days of rest, so it shows how tired recent training has made you.',
  tsb: "Training stress balance: yesterday's fitness minus yesterday's fatigue (CTL − ATL). Negative means you're carrying fatigue from recent training, which is normal while building. Positive means you're fresher than your fitness, as after a rest week or before an event.",
} as const;
