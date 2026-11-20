import { useState, type FormEvent } from 'react';
import type { PlanPresets } from '@/shared/api/client';
import { useRemovePlannedSession, useSavePlannedSession } from '@/shared/api/plan';
import { INTENSITY_LABELS, newSessionId, type PlanIntensity } from '@/shared/lib/plan';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Toggle } from '@/shared/ui/Toggle';
import { defaultTitle, sessionFromDraft, type PlanDraft } from '../../lib/planForm';
import { PLAN_FIELD_CLASS } from './planFieldClass';
import { PlanFormButtons } from './PlanFormButtons';

const INTENSITIES: readonly PlanIntensity[] = ['easy', 'medium', 'hard', 'custom'];

type SessionFormProps = {
  initial: PlanDraft;
  presets: PlanPresets;
  today: string;
  onClose: () => void;
};

/** A planned session's date, title and how hard it is (a preset or a custom TSS). */
export const SessionForm = ({ initial, presets, today, onClose }: SessionFormProps) => {
  const save = useSavePlannedSession();
  const remove = useRemovePlannedSession();
  const [draft, setDraft] = useState(initial);
  const isEditing = initial.id !== null;
  const session = sessionFromDraft(draft, draft.id ?? 'new', today);

  const intensityOptions = INTENSITIES.map((intensity) => ({
    value: intensity,
    label: intensity === 'custom' ? 'Custom' : `${INTENSITY_LABELS[intensity]} · ${presets[intensity]}`,
  }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    save.mutate({ ...session, id: draft.id ?? newSessionId() }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit}>
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          Date
          <input
            type="date"
            value={draft.date}
            min={isEditing ? undefined : today}
            required
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            className={PLAN_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          Title (optional)
          <input
            value={draft.title}
            maxLength={80}
            placeholder={defaultTitle(draft.intensity)}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className={PLAN_FIELD_CLASS}
          />
        </label>
        <div className="flex flex-col gap-1 text-xs text-ink-2">
          <span>How hard (TSS)</span>
          <Toggle
            label="How hard"
            value={draft.intensity}
            onChange={(intensity) => setDraft({ ...draft, intensity })}
            options={intensityOptions}
          />
        </div>
        {draft.intensity === 'custom' && (
          <label className="flex flex-col gap-1 text-xs text-ink-2">
            TSS
            <input
              inputMode="numeric"
              value={draft.tssText}
              placeholder="0–600"
              aria-invalid={draft.tssText !== '' && session === null}
              onChange={(event) => setDraft({ ...draft, tssText: event.target.value })}
              className={`${PLAN_FIELD_CLASS} w-24 tabular-nums`}
            />
          </label>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Planned TSS feeds the forecast on the Overview’s Fitness &amp; form chart. Preset values are set in Settings.
      </p>
      {(save.error || remove.error) && <ErrorMessage error={save.error ?? remove.error} />}
      <PlanFormButtons
        isEditing={isEditing}
        canSave={session !== null}
        isBusy={save.isPending || remove.isPending}
        saveLabel={isEditing ? 'Save' : 'Add to plan'}
        onDelete={() => remove.mutate(draft.id!, { onSuccess: onClose })}
        onClose={onClose}
      />
    </form>
  );
};
