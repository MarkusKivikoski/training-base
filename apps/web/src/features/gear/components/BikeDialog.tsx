import { useId, useState, type FormEvent } from 'react';
import { useRemoveBike, useSaveBike } from '@/shared/api/gear';
import { formatSport } from '@/shared/lib/formatters';
import { newId } from '@/shared/lib/ids';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { Dialog } from '@/shared/ui/Dialog';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { bikeFromDraft, type BikeDraft } from '../lib/gearForm';
import { GEAR_FIELD_CLASS, GearFormButtons } from './GearFormButtons';

type BikeDialogProps = {
  initial: BikeDraft;
  /** Sport types your rides have, to choose which go to this bike. */
  sportTypes: readonly string[];
  onClose: () => void;
};

/** Adds or edits a bike: its name, the ride types it's used for, and whether it's retired. */
export const BikeDialog = ({ initial, sportTypes, onClose }: BikeDialogProps) => {
  const titleId = useId();
  const save = useSaveBike();
  const remove = useRemoveBike();
  const [draft, setDraft] = useState(initial);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isEditing = initial.id !== null;
  const bike = bikeFromDraft(draft, draft.id ?? 'new');

  const toggleType = (type: string) => {
    const types = draft.types.includes(type) ? draft.types.filter((t) => t !== type) : [...draft.types, type];
    setDraft({ ...draft, types });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (bike) save.mutate({ ...bike, id: draft.id ?? newId('bike') }, { onSuccess: onClose });
  };

  const deleteBike = () => {
    setIsConfirmingDelete(false);
    if (draft.id) remove.mutate(draft.id, { onSuccess: onClose });
  };

  return (
    <Dialog labelledBy={titleId} onCancel={onClose}>
      <form onSubmit={submit}>
        <h2 id={titleId} className="text-lg font-semibold">
          {isEditing ? 'Edit bike' : 'Add a bike'}
        </h2>
        <label className="mt-4 flex flex-col gap-1 text-xs text-ink-2">
          Name
          <input
            value={draft.name}
            maxLength={60}
            required
            placeholder="e.g. Road bike"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className={GEAR_FIELD_CLASS}
          />
        </label>
        <fieldset className="mt-3">
          <legend className="text-xs text-ink-2">Used for these ride types</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {sportTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={draft.types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="size-4 accent-[var(--series-1)]"
                />
                {formatSport(type)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={draft.retired}
            onChange={(event) => setDraft({ ...draft, retired: event.target.checked })}
            className="size-4 accent-[var(--series-1)]"
          />
          Retired (keeps its history, gets no new rides)
        </label>
        <p className="mt-3 text-xs text-ink-3">
          Rides of the ticked types go to this bike, old and new. If two bikes share a type, the first one listed gets
          the ride; change a single ride on its page.
        </p>
        {(save.error || remove.error) && <ErrorMessage error={save.error ?? remove.error} />}
        <GearFormButtons
          isEditing={isEditing}
          canSave={bike !== null}
          isBusy={save.isPending || remove.isPending}
          saveLabel={isEditing ? 'Save' : 'Add bike'}
          onDelete={() => setIsConfirmingDelete(true)}
          onClose={onClose}
        />
      </form>
      {isConfirmingDelete && (
        <ConfirmationModal
          title={`Delete ${initial.name} and its components?`}
          message="Rides stay, just without a bike."
          confirmLabel="Delete"
          isDestructive
          onConfirm={deleteBike}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </Dialog>
  );
};
