import { useEffect, useState, type FormEvent } from 'react';
import type { Activity } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useActivityNote, useSaveActivityNote } from '../../api';
import { ratingLoadText, RPE_LABELS, RPE_VALUES } from '../../lib/feelText';

type FeelCardProps = {
  activity: Activity;
};

type Draft = { rpe: number | null; note: string };

const MAX_NOTE_LENGTH = 500;

/** How the activity felt: an effort rating from 1 to 10 and a note, saved with the activity. */
export const FeelCard = ({ activity }: FeelCardProps) => {
  const saved = useActivityNote(activity.id);
  const save = useSaveActivityNote();
  const [draft, setDraft] = useState<Draft | null>(null);

  // Start from the saved note once it loads.
  useEffect(() => {
    if (saved.data !== undefined && draft === null) {
      setDraft({ rpe: saved.data?.rpe ?? null, note: saved.data?.note ?? '' });
    }
  }, [saved.data, draft]);

  if (!draft) return null;

  const savedRpe = saved.data?.rpe ?? null;
  const savedNote = saved.data?.note ?? '';
  const isChanged = draft.rpe !== savedRpe || draft.note.trim() !== savedNote;
  const loadText = ratingLoadText(activity, draft.rpe);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isChanged) save.mutate({ id: activity.id, rpe: draft.rpe, note: draft.note });
  };

  return (
    <Card title="How it felt" className="lg:col-span-3">
      <form onSubmit={submit}>
        <div role="radiogroup" aria-label="Effort, 1 very easy to 10 all-out" className="flex flex-wrap gap-1">
          {RPE_VALUES.map((rpe) => {
            const isSelected = draft.rpe === rpe;
            return (
              <button
                key={rpe}
                type="button"
                role="radio"
                aria-checked={isSelected}
                title={RPE_LABELS[rpe]}
                // Clicking the selected rating clears it.
                onClick={() => setDraft({ ...draft, rpe: isSelected ? null : rpe })}
                className={`size-9 rounded-lg border text-sm font-semibold tabular-nums ${
                  isSelected ? 'border-ink bg-ink text-surface-1' : 'border-line text-ink-2 hover:text-ink'
                }`}
              >
                {rpe}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-ink-3">
          {draft.rpe === null
            ? 'Rate the effort: 1 very easy, 7 hard, 10 all-out.'
            : `${draft.rpe} · ${RPE_LABELS[draft.rpe]}`}
          {loadText && ` · ${loadText} (an estimate, not counted in fitness).`}
        </p>
        <label className="mt-3 flex flex-col gap-1 text-xs text-ink-2">
          Note
          <textarea
            value={draft.note}
            maxLength={MAX_NOTE_LENGTH}
            rows={2}
            placeholder="Legs, weather, fuelling…"
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            className="rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink"
          />
        </label>
        {save.error && <ErrorMessage error={save.error} />}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={!isChanged || save.isPending}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          {!isChanged && (savedRpe !== null || savedNote) && <span className="text-xs text-ink-3">Saved</span>}
        </div>
      </form>
    </Card>
  );
};
