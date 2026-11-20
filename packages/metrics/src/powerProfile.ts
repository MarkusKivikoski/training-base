/**
 * Rider profile from the shape of the power curve, after Coggan's power profile: W/kg at 5 s,
 * 1 min, 5 min and functional threshold, each placed on a 0–100 % scale between the "untrained"
 * and "world class" ends of the reference ranges (Allen & Coggan, men's table). Which durations
 * score highest relative to the others gives the rider type.
 */

export const PROFILE_DURATIONS = [
  { key: 'sprint', label: '5 s', durationS: 5, low: 10.17, high: 25.18 },
  { key: 'anaerobic', label: '1 min', durationS: 60, low: 5.64, high: 11.5 },
  { key: 'vo2', label: '5 min', durationS: 300, low: 2.33, high: 7.6 },
  { key: 'threshold', label: 'FTP', durationS: 1200, low: 1.86, high: 6.4 },
] as const;

/** FTP from the 20-minute best, as in the Coggan test. */
const FTP_FROM_20MIN = 0.95;

/** Scores this close together count as a flat profile. */
export const FLAT_SPREAD = 0.1;

export type RiderType = 'sprinter' | 'pursuiter' | 'time-trialist' | 'all-rounder';

export const RIDER_TYPES: Record<RiderType, { label: string; description: string }> = {
  sprinter: { label: 'Sprinter', description: 'Short, explosive efforts (5 s to 1 min) are your relative strength.' },
  pursuiter: {
    label: 'Pursuiter',
    description: 'Your 5-minute power stands out: strong on short climbs and hard surges of a few minutes.',
  },
  'time-trialist': {
    label: 'Time trialist / climber',
    description: 'Sustained power at threshold is your relative strength; the sprint lags behind.',
  },
  'all-rounder': {
    label: 'All-rounder',
    description: 'No duration stands out: your curve is balanced from sprint to threshold.',
  },
};

export interface ProfilePoint {
  key: (typeof PROFILE_DURATIONS)[number]['key'];
  label: string;
  watts: number;
  wkg: number;
  /** 0 = untrained end of the reference range, 1 = world class (may fall outside). */
  score: number;
}

export interface PowerProfile {
  points: ProfilePoint[];
  type: RiderType;
}

/**
 * Profile from the best power per duration (`watts` keyed by duration in seconds) and the body
 * weight that applied to each effort (`kgFor`). Null when any of the four durations or the weight
 * is missing.
 */
export function powerProfile(
  best: ReadonlyArray<{ durationS: number; watts: number; date: string }>,
  kgFor: (date: string) => number | null,
): PowerProfile | null {
  const points: ProfilePoint[] = [];
  for (const d of PROFILE_DURATIONS) {
    const p = best.find((x) => x.durationS === d.durationS);
    const kg = p ? kgFor(p.date) : null;
    if (!p || !kg || kg <= 0) return null;
    const watts = d.key === 'threshold' ? p.watts * FTP_FROM_20MIN : p.watts;
    const wkg = watts / kg;
    points.push({ key: d.key, label: d.label, watts, wkg, score: (wkg - d.low) / (d.high - d.low) });
  }
  return { points, type: riderType(points.map((p) => p.score) as [number, number, number, number]) };
}

/** Rider type from the four scores (5 s, 1 min, 5 min, FTP). */
export function riderType([s5, s60, s300, sFt]: readonly [number, number, number, number]): RiderType {
  const all = [s5, s60, s300, sFt];
  if (Math.max(...all) - Math.min(...all) < FLAT_SPREAD) return 'all-rounder';
  const short = (s5 + s60) / 2;
  if (short - sFt >= FLAT_SPREAD && short >= s300) return 'sprinter';
  if (sFt - short >= FLAT_SPREAD && sFt >= s300 - FLAT_SPREAD / 2) return 'time-trialist';
  if (s300 >= short && s300 >= sFt) return 'pursuiter';
  return 'all-rounder';
}

/** Weight on `date`: the latest entry on or before it, else the earliest entry (weight may be applied back). */
export function weightOnDate(entries: ReadonlyArray<{ from: string; kg: number }>, date: string): number | null {
  let best: { from: string; kg: number } | null = null;
  let earliest: { from: string; kg: number } | null = null;
  for (const e of entries) {
    if (e.from <= date && (!best || e.from > best.from)) best = e;
    if (!earliest || e.from < earliest.from) earliest = e;
  }
  return (best ?? earliest)?.kg ?? null;
}
