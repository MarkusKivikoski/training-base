import { addDays, isoWeekStart } from './weeklyVolume.js';

/** Activity groups for the all-activities load view. */
export const LOAD_CATEGORIES = ['cycling', 'running', 'strength', 'skiing', 'other'] as const;
export type LoadCategory = (typeof LOAD_CATEGORIES)[number];

/** Which group a Garmin activity type belongs to (cycling is decided by `isCycling`). */
export function loadCategory(sport: string, isCycling: boolean): LoadCategory {
  if (isCycling) return 'cycling';
  if (/running|treadmill/.test(sport)) return 'running';
  if (/strength|fitness_equipment/.test(sport)) return 'strength';
  if (/ski|snowboard/.test(sport)) return 'skiing';
  return 'other';
}

export interface ActivityLoadInput {
  date: string;
  sport: string;
  isCycling: boolean;
  /** Cycling load (power TSS, or HR TSS without power). */
  load: { tss: number } | null;
  /** Heart-rate TSS, any activity with heart rate and an LTHR in effect. */
  hrLoad: { tss: number } | null;
}

/** The TSS an activity adds to the all-activities view: its cycling load, or HR TSS for other sports. */
export function activityTss(a: ActivityLoadInput): number | null {
  return a.isCycling ? (a.load?.tss ?? null) : (a.hrLoad?.tss ?? null);
}

export type WeekCategoryLoad = { weekStart: string } & Record<LoadCategory, number>;

/** TSS per ISO week and group, for the `weeks` weeks ending with the week of `endDate`, oldest first. */
export function weeklyLoadByCategory(
  activities: readonly ActivityLoadInput[],
  { endDate, weeks }: { endDate: string; weeks: number },
): WeekCategoryLoad[] {
  const last = isoWeekStart(endDate);
  const out: WeekCategoryLoad[] = [];
  const byWeek = new Map<string, WeekCategoryLoad>();
  for (let i = weeks - 1; i >= 0; i--) {
    const w: WeekCategoryLoad = {
      weekStart: addDays(last, -7 * i),
      cycling: 0,
      running: 0,
      strength: 0,
      skiing: 0,
      other: 0,
    };
    out.push(w);
    byWeek.set(w.weekStart, w);
  }
  for (const a of activities) {
    const tss = activityTss(a);
    const w = tss === null ? undefined : byWeek.get(isoWeekStart(a.date));
    if (w && a.date <= endDate) w[loadCategory(a.sport, a.isCycling)] += tss!;
  }
  return out;
}
