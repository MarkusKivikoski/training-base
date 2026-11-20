import { addDays } from './weeklyVolume.js';

/** Training-status levels, shown with the dataviz status palette (plus an icon and label). */
export type LoadStatus = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

/** A zone covers [min, max); a null bound is open-ended. */
export interface LoadZone {
  status: LoadStatus;
  label: string;
  min: number | null;
  max: number | null;
}

/** Form as % of fitness (TSB ÷ CTL × 100), as intervals.icu does: works at any fitness level. */
export const FORM_ZONES: readonly LoadZone[] = [
  { status: 'critical', label: 'High risk', min: null, max: -30 },
  { status: 'good', label: 'Optimal training', min: -30, max: -10 },
  { status: 'neutral', label: 'Neutral', min: -10, max: 5 },
  { status: 'neutral', label: 'Fresh', min: 5, max: 20 },
  { status: 'warning', label: 'Transition (losing fitness)', min: 20, max: null },
];

/** Fatigue relative to fitness (ATL ÷ CTL, the acute:chronic load ratio). */
export const FATIGUE_ZONES: readonly LoadZone[] = [
  { status: 'warning', label: 'Undertraining', min: null, max: 0.8 },
  { status: 'good', label: 'Optimal', min: 0.8, max: 1.3 },
  { status: 'serious', label: 'Overreaching', min: 1.3, max: 1.5 },
  { status: 'critical', label: 'High risk', min: 1.5, max: null },
];

/** Fitness ramp rate: CTL change over the last 7 days. */
export const RAMP_ZONES: readonly LoadZone[] = [
  { status: 'warning', label: 'Losing fitness', min: null, max: 0 },
  { status: 'neutral', label: 'Maintaining', min: 0, max: 2 },
  { status: 'good', label: 'Building', min: 2, max: 7 },
  { status: 'serious', label: 'Steep build', min: 7, max: 10 },
  { status: 'critical', label: 'Too steep', min: 10, max: null },
];

/**
 * Zones need a settled model: CTL takes about 6 weeks (its 42-day constant) to reflect real
 * fitness when the load history starts from zero, and ratios to a tiny CTL are meaningless.
 */
export const BASELINE_DAYS = 42;
export const MIN_CTL_FOR_ZONES = 5;

export function zoneFor(value: number, zones: readonly LoadZone[]): LoadZone {
  return zones.find((z) => (z.min === null || value >= z.min) && (z.max === null || value < z.max)) ?? zones.at(-1)!;
}

export interface DayLoadInput {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export type Classified = { baseline: true } | { baseline: false; zone: LoadZone; value: number };

export interface DayStatus {
  /** Ramp rate (CTL change over 7 days). */
  fitness: Classified;
  /** ATL ÷ CTL. */
  fatigue: Classified;
  /** TSB as % of CTL. */
  form: Classified;
  /** First date the zones apply (BASELINE_DAYS after the first day with load). */
  baselineUntil: string | null;
}

/**
 * The CTL that TSB is measured against: TSB is yesterday's CTL − ATL, so form % uses
 * yesterday's CTL too (today's on the first day).
 */
const formBase = (days: readonly DayLoadInput[], i: number) => days[i - 1]?.ctl ?? days[i]!.ctl;

const inBaseline = (days: readonly DayLoadInput[], i: number) => i < BASELINE_DAYS || days[i]!.ctl < MIN_CTL_FOR_ZONES;

/** Statuses for day `i` of a daily-load series that starts at the first day with load. */
export function loadStatus(days: readonly DayLoadInput[], i = days.length - 1): DayStatus {
  const baselineUntil = days[0] ? addDays(days[0].date, BASELINE_DAYS) : null;
  const d = days[i];
  if (!d || inBaseline(days, i))
    return { fitness: { baseline: true }, fatigue: { baseline: true }, form: { baseline: true }, baselineUntil };
  const ramp = d.ctl - (days[i - 7]?.ctl ?? days[0]!.ctl);
  const ratio = d.atl / d.ctl;
  const formPct = (d.tsb / formBase(days, i)) * 100;
  return {
    fitness: { baseline: false, zone: zoneFor(ramp, RAMP_ZONES), value: ramp },
    fatigue: { baseline: false, zone: zoneFor(ratio, FATIGUE_ZONES), value: ratio },
    form: { baseline: false, zone: zoneFor(formPct, FORM_ZONES), value: formPct },
    baselineUntil,
  };
}

export interface DayBands {
  /** Safe fatigue band around fitness: CTL × 0.8 … CTL × 1.3. */
  fatigueLow: number;
  fatigueHigh: number;
  /** Form zone edges in TSB units, low to high: −30 %, −10 %, +5 %, +20 % of CTL. */
  formEdges: [number, number, number, number];
}

/** Absolute band edges per day for the chart; null during the baseline period. */
export function zoneBands(days: readonly DayLoadInput[]): (DayBands | null)[] {
  const fatigueOptimal = FATIGUE_ZONES.find((z) => z.status === 'good')!;
  const edges = [FORM_ZONES[1]!.min!, FORM_ZONES[2]!.min!, FORM_ZONES[3]!.min!, FORM_ZONES[4]!.min!];
  return days.map((d, i) => {
    if (inBaseline(days, i)) return null;
    const base = formBase(days, i);
    return {
      fatigueLow: d.ctl * fatigueOptimal.min!,
      fatigueHigh: d.ctl * fatigueOptimal.max!,
      formEdges: edges.map((pct) => (base * pct) / 100) as [number, number, number, number],
    };
  });
}
