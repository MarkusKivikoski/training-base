import { useId, useState, type FormEvent } from 'react';
import { useRemoveComponent, useSaveComponent } from '@/shared/api/gear';
import { newId } from '@/shared/lib/ids';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { Dialog } from '@/shared/ui/Dialog';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { componentFromDraft, type ComponentDraft } from '../lib/gearForm';
import { GEAR_FIELD_CLASS, GearFormButtons } from './GearFormButtons';

type ComponentDialogProps = {
  initial: ComponentDraft;
  bikeName: string;
  today: string;
  onClose: () => void;
};

/** Adds or edits a component: name, when it was fitted, and when to replace it (km and/or hours). */
export const ComponentDialog = ({ initial, bikeName, today, onClose }: ComponentDialogProps) => {
  const titleId = useId();
  const save = useSaveComponent();
  const remove = useRemoveComponent();
  const [draft, setDraft] = useState(initial);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isEditing = initial.id !== null;
  const component = componentFromDraft(draft, draft.id ?? 'new', today);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (component) save.mutate({ ...component, id: draft.id ?? newId('part') }, { onSuccess: onClose });
  };

  const deleteComponent = () => {
    setIsConfirmingDelete(false);
    if (draft.id) remove.mutate(draft.id, { onSuccess: onClose });
  };

  return (
    <Dialog labelledBy={titleId} onCancel={onClose}>
      <form onSubmit={submit}>
        <h2 id={titleId} className="text-lg font-semibold">
          {isEditing ? 'Edit component' : 'Add a component'} · {bikeName}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-ink-2 sm:col-span-2">
            Name
            <input
              value={draft.name}
              maxLength={60}
              required
              placeholder="e.g. Chain, rear tyre"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className={GEAR_FIELD_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-2">
            Fitted on
            <input
              type="date"
              value={draft.installedOn}
              max={today}
              required
              onChange={(event) => setDraft({ ...draft, installedOn: event.target.value })}
              className={GEAR_FIELD_CLASS}
            />
          </label>
          <span />
          <label className="flex flex-col gap-1 text-xs text-ink-2">
            Replace after (km, optional)
            <input
              inputMode="numeric"
              value={draft.intervalKmText}
              placeholder="e.g. 3000"
              onChange={(event) => setDraft({ ...draft, intervalKmText: event.target.value })}
              className={`${GEAR_FIELD_CLASS} tabular-nums`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-2">
            or after (riding hours, optional)
            <input
              inputMode="numeric"
              value={draft.intervalHoursText}
              placeholder="e.g. 150"
              onChange={(event) => setDraft({ ...draft, intervalHoursText: event.target.value })}
              className={`${GEAR_FIELD_CLASS} tabular-nums`}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Usage counts this bike’s rides from the fitted date. With both intervals, whichever comes first decides.
        </p>
        {(save.error || remove.error) && <ErrorMessage error={save.error ?? remove.error} />}
        <GearFormButtons
          isEditing={isEditing}
          canSave={component !== null}
          isBusy={save.isPending || remove.isPending}
          saveLabel={isEditing ? 'Save' : 'Add component'}
          onDelete={() => setIsConfirmingDelete(true)}
          onClose={onClose}
        />
      </form>
      {isConfirmingDelete && (
        <ConfirmationModal
          title={`Delete ${initial.name}?`}
          confirmLabel="Delete"
          isDestructive
          onConfirm={deleteComponent}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </Dialog>
  );
};
