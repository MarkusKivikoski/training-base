import type { TimeRange } from '@app/metrics';
import type { IntervalDraft } from './intervalEdits';

/** A saved interval edit that can be undone: what it did, and the ride's hand-set intervals before it. */
export type UndoStep = {
  /** "removed interval 3", "trimmed interval 1" … */
  description: string;
  /** The hand-set intervals before the edit; null when the ride showed the detected ones. */
  before: TimeRange[] | null;
};

/** Undo steps by activity id, newest last. */
export type UndoHistory = Readonly<Record<string, readonly UndoStep[]>>;

/** The most edits kept to undo, per ride. */
export const MAX_UNDO_STEPS = 20;

/** The history with one more step for the ride, dropping its oldest past the limit. */
export const withUndoStep = (history: UndoHistory, activityId: string, step: UndoStep): UndoHistory => {
  const steps = [...(history[activityId] ?? []), step].slice(-MAX_UNDO_STEPS);
  return { ...history, [activityId]: steps };
};

/** The history without the ride's newest step, once it has been undone. */
export const withoutLastStep = (history: UndoHistory, activityId: string): UndoHistory => {
  const steps = (history[activityId] ?? []).slice(0, -1);
  return { ...history, [activityId]: steps };
};

/** What saving the draft does, for the undo button. */
export const draftEditDescription = (draft: IntervalDraft): string => {
  if (draft.editingIndex === null) return 'added an interval';
  return `trimmed interval ${draft.editingIndex + 1}`;
};
