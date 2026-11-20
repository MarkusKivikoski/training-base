/**
 * The sports that get their own records, heatmap routes and year in review. Cycling is the
 * primary one and the default everywhere; other activity types belong to neither.
 */
export const DISCIPLINES = ['cycling', 'running'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export interface DisciplineInput {
  isCycling: boolean;
  isRunning: boolean;
}

/** Which discipline an activity belongs to; null for other activity types (strength, skiing …). */
export function disciplineOf(activity: DisciplineInput): Discipline | null {
  if (activity.isCycling) return 'cycling';
  if (activity.isRunning) return 'running';
  return null;
}
