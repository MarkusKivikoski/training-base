import type { TimeRange } from '@app/metrics';
import { useMemo, useState } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { useHandSetIntervals, useSetIntervals } from '../api';
import {
  checkIntervalDraft,
  draftMark,
  shownIntervals,
  trimDraft,
  withInterval,
  withoutInterval,
  withPickedTime,
  type IntervalDraft,
} from '../lib/intervalEdits';
import {
  draftEditDescription,
  withoutLastStep,
  withUndoStep,
  type UndoHistory,
  type UndoStep,
} from '../lib/intervalUndo';
import { workIntervals } from '../lib/rideIntervals';

const NO_INTERVALS: readonly TimeRange[] = [];
const NO_UNDO_STEPS: readonly UndoStep[] = [];

const EMPTY_DRAFT: IntervalDraft = { start: '', end: '', editingIndex: null };

/**
 * A ride's work intervals (detected, or set by hand) and the edits on them: removing one, adding
 * one, trimming one (typed, or picked by clicking the ride chart), going back to detection, and
 * undoing those edits one by one.
 */
export const useIntervalEditor = (activityId: string, stream: ActivityStreams | undefined, ftp: number | null) => {
  const handSet = useHandSetIntervals(activityId);
  const save = useSetIntervals();
  // Kept with its ride, so moving to another activity drops an unfinished draft.
  const [draftState, setDraftState] = useState<{ activityId: string; draft: IntervalDraft } | null>(null);
  const draft = draftState?.activityId === activityId ? draftState.draft : null;
  // Per ride, for as long as the page is open.
  const [undoHistory, setUndoHistory] = useState<UndoHistory>({});
  const lastUndoStep = (undoHistory[activityId] ?? NO_UNDO_STEPS).at(-1) ?? null;

  const detected = useMemo(() => (stream ? workIntervals(stream, ftp) : NO_INTERVALS), [stream, ftp]);
  // The end of the last recorded second.
  const rideEndS = (stream?.time.at(-1) ?? -1) + 1;
  const handSetIntervals = handSet.data ?? null;
  const intervals = useMemo(
    () => shownIntervals(detected, handSetIntervals, rideEndS),
    [detected, handSetIntervals, rideEndS],
  );
  const draftCheck = useMemo(
    () => (draft ? checkIntervalDraft(draft, intervals, rideEndS) : null),
    [draft, intervals, rideEndS],
  );
  const chartMark = useMemo(() => (draft ? draftMark(draft) : null), [draft]);

  const setDraft = (next: IntervalDraft | null) => setDraftState(next ? { activityId, draft: next } : null);

  /** Saves an edit and, once it is saved, remembers what it replaced so it can be undone. */
  const saveEdit = (next: TimeRange[] | null, description: string, onSaved?: () => void) => {
    const before = handSetIntervals === null ? null : [...handSetIntervals];
    const rememberStep = () => {
      setUndoHistory((history) => withUndoStep(history, activityId, { description, before }));
      onSaved?.();
    };
    save.mutate({ id: activityId, intervals: next }, { onSuccess: rememberStep });
  };

  const undo = () => {
    if (!lastUndoStep) return;
    const forgetStep = () => setUndoHistory((history) => withoutLastStep(history, activityId));
    save.mutate({ id: activityId, intervals: lastUndoStep.before }, { onSuccess: forgetStep });
  };

  const pickTime = (seconds: number) => {
    if (!draft) return;
    const clamped = Math.min(Math.max(0, Math.round(seconds)), rideEndS);
    setDraft(withPickedTime(draft, clamped));
  };

  const saveDraft = () => {
    if (!draft || draftCheck?.status !== 'valid') return;
    const next = withInterval(intervals, draftCheck.range, draft.editingIndex);
    saveEdit(next, draftEditDescription(draft), () => setDraft(null));
  };

  return {
    /** The intervals shown: set by hand, else detected. Wait for `isLoaded` before showing them. */
    intervals,
    isLoaded: !handSet.isPending,
    isHandSet: handSetIntervals !== null,
    detectedCount: detected.length,
    draft,
    draftCheck,
    /** The draft on the ride chart. */
    chartMark,
    startAdding: () => setDraft(EMPTY_DRAFT),
    startTrimming: (index: number) => setDraft(trimDraft(intervals, index)),
    changeDraft: setDraft,
    cancelDraft: () => setDraft(null),
    /** Sets a draft time from a click on the ride chart; undefined while there is no draft. */
    pickTime: draft ? pickTime : undefined,
    saveDraft,
    remove: (index: number) => saveEdit(withoutInterval(intervals, index), `removed interval ${index + 1}`),
    resetToDetected: () => saveEdit(null, 'went back to the detected intervals'),
    /** What the newest edit on this ride did, or null when there is nothing to undo. */
    undoDescription: lastUndoStep?.description ?? null,
    undo,
    isSaving: save.isPending,
    saveError: save.error,
  };
};

export type IntervalEditor = ReturnType<typeof useIntervalEditor>;
