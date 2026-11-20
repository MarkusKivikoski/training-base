import { useState, type FormEvent } from 'react';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import type { Goal } from '@/shared/api/client';
import { useSaveGoals } from '../../api';
import { MAX_GOALS } from '../../constants';
import { GoalDraftRow } from './GoalDraftRow';
import { isValidTarget, newDraft, toDraft, toGoals, type GoalDraft } from './goalDraft';

type GoalEditorProps = {
  goals: readonly Goal[];
  onDone: () => void;
};

/** Edits the whole goal list, saved in one go. */
export const GoalEditor = ({ goals, onDone }: GoalEditorProps) => {
  const save = useSaveGoals();
  const [drafts, setDrafts] = useState<GoalDraft[]>(() => goals.map(toDraft));
  const hasInvalidTarget = drafts.some((draft) => !isValidTarget(draft.text));
  const canAddMore = drafts.length < MAX_GOALS;

  const updateDraft = (id: string, patch: Partial<GoalDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  const removeDraft = (id: string) => setDrafts((current) => current.filter((draft) => draft.id !== id));
  const addDraft = () => setDrafts((current) => [...current, newDraft()]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (hasInvalidTarget) return;
    save.mutate(toGoals(drafts), { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {drafts.length === 0 && <p className="text-sm text-ink-3">No goals. Add one below.</p>}
      {drafts.map((draft) => (
        <GoalDraftRow
          key={draft.id}
          draft={draft}
          onChange={(patch) => updateDraft(draft.id, patch)}
          onRemove={() => removeDraft(draft.id)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {canAddMore && (
          <button
            type="button"
            onClick={addDraft}
            className="rounded-lg border border-dashed border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink"
          >
            + Add goal
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-ink-2 hover:underline">
          Cancel
        </button>
        <button
          type="submit"
          disabled={hasInvalidTarget || save.isPending}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
        >
          Save goals
        </button>
      </div>

      <p className="text-xs text-ink-3">
        Cycling only. Time is moving time; distance includes indoor rides that record one.
      </p>
      {save.error && <ErrorMessage error={save.error} />}
    </form>
  );
};
