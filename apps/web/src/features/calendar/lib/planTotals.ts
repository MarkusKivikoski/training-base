import type { PlannedSession, PlanPresets } from '@/shared/api/client';
import { plannedTss } from '@/shared/lib/plan';

/** Planned TSS on the given dates from `fromDate` on (sessions before it are past). */
export const upcomingPlannedTss = (
  dates: readonly string[],
  plannedByDate: ReadonlyMap<string, PlannedSession[]>,
  presets: PlanPresets,
  fromDate: string,
): number => {
  let total = 0;
  for (const date of dates) {
    if (date < fromDate) continue;
    for (const session of plannedByDate.get(date) ?? []) total += plannedTss(session, presets);
  }
  return total;
};
