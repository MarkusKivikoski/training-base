import {
  activityTss,
  addDays,
  LOAD_CATEGORIES,
  type ActivityLoadInput,
  type LoadCategory,
  type WeekCategoryLoad,
} from '@app/metrics';

/** Fixed colour per group, so hiding empty groups never repaints the others. */
export const LOAD_CATEGORY_LOOK: Record<LoadCategory, { label: string; color: string }> = {
  cycling: { label: 'Cycling', color: '--series-1' },
  running: { label: 'Running', color: '--series-3' },
  strength: { label: 'Strength', color: '--series-5' },
  skiing: { label: 'Skiing', color: '--series-4' },
  other: { label: 'Other', color: '--text-muted' },
};

/** A week's TSS across all groups. */
export const weekTotal = (week: WeekCategoryLoad) => {
  let total = 0;
  for (const category of LOAD_CATEGORIES) total += week[category];
  return total;
};

/** The groups that have any load in these weeks, in the fixed group order. */
export const groupsWithLoad = (weeks: readonly WeekCategoryLoad[]): LoadCategory[] =>
  LOAD_CATEGORIES.filter((category) => weeks.some((week) => week[category] > 0));

type CountableActivity = ActivityLoadInput & { avgHr: number | null };

/** TSS in the 7 days ending today, split into cycling and other sports. */
export const lastSevenDaysTss = (activities: readonly ActivityLoadInput[], today: string) => {
  const firstDay = addDays(today, -6);
  let cycling = 0;
  let other = 0;
  for (const activity of activities) {
    if (activity.date < firstDay || activity.date > today) continue;
    const tss = activityTss(activity) ?? 0;
    if (activity.isCycling) cycling += tss;
    else other += tss;
  }
  return { cycling, other };
};

/** Other-sport activities with heart-rate load, and those with heart rate but no load yet (before the first LTHR). */
export const countOtherSports = (activities: readonly CountableActivity[]) => {
  let withLoad = 0;
  let withoutLoad = 0;
  for (const activity of activities) {
    if (activity.isCycling) continue;
    if (activity.hrLoad) withLoad++;
    else if (activity.avgHr !== null) withoutLoad++;
  }
  return { withLoad, withoutLoad };
};
