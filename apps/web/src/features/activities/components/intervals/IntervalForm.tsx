import type { FormEvent, KeyboardEvent } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import type { IntervalEditor } from '../../hooks/useIntervalEditor';
import { draftSummary } from '../../lib/intervalDraftText';
import type { IntervalDraft } from '../../lib/intervalEdits';
import { ClockField } from './ClockField';

type IntervalFormProps = {
  editor: IntervalEditor;
  draft: IntervalDraft;
  stream: ActivityStreams;
  ftp: number | null;
};

const ADD_HINT = 'Type m:ss or h:mm:ss, or click the ride chart below: first the start, then the end.';
const TRIM_HINT =
  'Step a time with − / + (or ↑ ↓, Shift for 10 s), type it, or click the ride chart near an edge to move that edge.';

/** Adds an interval, or trims an existing one, from a start and an end; previews its stats as you go. */
export const IntervalForm = ({ editor, draft, stream, ftp }: IntervalFormProps) => {
  const check = editor.draftCheck;
  const trimmedNumber = draft.editingIndex === null ? null : draft.editingIndex + 1;
  const isTrimming = trimmedNumber !== null;
  const isUnchanged = check?.status === 'valid' && check.isUnchanged;
  const canSave = check?.status === 'valid' && !isUnchanged && !editor.isSaving;
  const summary = draftSummary(check, stream, ftp);
  const isProblem = check?.status === 'invalid';
  const title = isTrimming ? `Trim interval ${trimmedNumber}` : 'Add an interval';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    editor.saveDraft();
  };

  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') editor.cancelDraft();
  };

  return (
    <form onSubmit={submit} onKeyDown={cancelOnEscape} className="rounded-lg border border-line p-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <ClockField
          label="Start"
          value={draft.start}
          autoFocus={!isTrimming}
          onChange={(start) => editor.changeDraft({ ...draft, start })}
        />
        <ClockField label="End" value={draft.end} onChange={(end) => editor.changeDraft({ ...draft, end })} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-40"
          >
            {isTrimming ? 'Save' : 'Add'}
          </button>
          <button type="button" onClick={editor.cancelDraft} className="px-2 py-1.5 text-sm text-ink-2 hover:underline">
            Cancel
          </button>
        </div>
      </div>
      <p aria-live="polite" className={`mt-2 min-h-5 text-sm ${isProblem ? 'text-status-critical' : 'text-ink'}`}>
        {summary}
      </p>
      <p className="mt-1 text-xs text-ink-3">{isTrimming ? TRIM_HINT : ADD_HINT}</p>
    </form>
  );
};
