import type { Goal } from '@/shared/api/client';

/** A goal being edited: `text` is the target as typed, which may not be a valid number yet. */
export type GoalDraft = Goal & { text: string };

const MAX_TARGET = 1_000_000;

export const toDraft = (goal: Goal): GoalDraft => ({ ...goal, text: String(goal.target) });

export const newDraft = (): GoalDraft => ({
  id: `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  metric: 'distance',
  period: 'year',
  target: 3000,
  text: '3000',
});

const parseTarget = (text: string) => Number(text.replace(',', '.'));

export const isValidTarget = (text: string) => {
  const target = parseTarget(text);
  return target > 0 && target <= MAX_TARGET;
};

/** The drafts as goals to save (only call when every target is valid). */
export const toGoals = (drafts: readonly GoalDraft[]): Goal[] =>
  drafts.map(({ id, metric, period, text }) => ({ id, metric, period, target: parseTarget(text) }));
