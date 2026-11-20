import { useState, type FormEvent } from 'react';
import type { Tyre } from '@/shared/api/client';
import { useRemoveTyre, useSaveTyre } from '@/shared/api/gear';
import type { TyreTotals } from '@/shared/lib/gear';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { rideCountText, tyreUsageText } from '../lib/gearText';
import { GEAR_FIELD_CLASS } from './GearFormButtons';

type TyreRowProps = {
  tyre: Tyre;
  /** Distance, riding time and ride count of the rides tagged with these tyres; undefined without any. */
  totals: TyreTotals | undefined;
};

const LINK_BUTTON_CLASS = 'text-xs text-ink-2 hover:text-ink hover:underline';

/** One set of tyres: its name and how much it has been used, with rename and remove. */
export const TyreRow = ({ tyre, totals }: TyreRowProps) => {
  const rideCount = totals?.rides ?? 0;
  const save = useSaveTyre();
  const remove = useRemoveTyre();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(tyre.name);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  const startEditing = () => {
    setName(tyre.name);
    setIsEditing(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) save.mutate({ id: tyre.id, name: trimmed }, { onSuccess: () => setIsEditing(false) });
  };

  const removeTyre = () => {
    setIsConfirmingRemove(false);
    remove.mutate(tyre.id);
  };

  if (isEditing) {
    return (
      <li className="py-2">
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`tyre-name-${tyre.id}`}>
            Name of the tyres
          </label>
          <input
            id={`tyre-name-${tyre.id}`}
            autoFocus
            value={name}
            maxLength={40}
            required
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsEditing(false);
            }}
            className={GEAR_FIELD_CLASS}
          />
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0"
          >
            Save
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className={LINK_BUTTON_CLASS}>
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <span className="font-medium">{tyre.name}</span>
      <span className="text-xs text-ink-3">{tyreUsageText(totals)}</span>
      <span className="ml-auto flex items-center gap-3">
        <button type="button" onClick={startEditing} className={LINK_BUTTON_CLASS}>
          Rename
        </button>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => setIsConfirmingRemove(true)}
          className={LINK_BUTTON_CLASS}
        >
          Remove
        </button>
      </span>
      {isConfirmingRemove && (
        <ConfirmationModal
          title={`Remove the ${tyre.name} tyres?`}
          message={rideCount > 0 ? `${rideCountText(rideCount)} will lose the tag.` : undefined}
          confirmLabel="Remove"
          isDestructive
          onConfirm={removeTyre}
          onCancel={() => setIsConfirmingRemove(false)}
        />
      )}
    </li>
  );
};
