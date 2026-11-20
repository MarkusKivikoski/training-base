import { useState, type FormEvent } from 'react';
import { useRemovePlannedEvent, useSavePlannedEvent } from '@/shared/api/plan';
import { newSessionId } from '@/shared/lib/plan';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { eventFromDraft, type EventDraft } from '../../lib/planForm';
import { PLAN_FIELD_CLASS } from './planFieldClass';
import { PlanFormButtons } from './PlanFormButtons';

type EventFormProps = {
  initial: EventDraft;
  today: string;
  onClose: () => void;
};

/** A target event's date and name. */
export const EventForm = ({ initial, today, onClose }: EventFormProps) => {
  const save = useSavePlannedEvent();
  const remove = useRemovePlannedEvent();
  const [draft, setDraft] = useState(initial);
  const isEditing = initial.id !== null;
  const event = eventFromDraft(draft, draft.id ?? 'new', today);

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    save.mutate({ ...event, id: draft.id ?? newSessionId() }, { onSuccess: onClose });
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
            onChange={(changeEvent) => setDraft({ ...draft, date: changeEvent.target.value })}
            className={PLAN_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          Name
          <input
            value={draft.name}
            maxLength={80}
            required
            placeholder="e.g. a race or a big ride"
            onChange={(changeEvent) => setDraft({ ...draft, name: changeEvent.target.value })}
            className={PLAN_FIELD_CLASS}
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        The Overview counts down to your next event and shows your projected form on the day, from the sessions you plan
        before it.
      </p>
      {(save.error || remove.error) && <ErrorMessage error={save.error ?? remove.error} />}
      <PlanFormButtons
        isEditing={isEditing}
        canSave={event !== null}
        isBusy={save.isPending || remove.isPending}
        saveLabel={isEditing ? 'Save' : 'Add event'}
        onDelete={() => remove.mutate(draft.id!, { onSuccess: onClose })}
        onClose={onClose}
      />
    </form>
  );
};
