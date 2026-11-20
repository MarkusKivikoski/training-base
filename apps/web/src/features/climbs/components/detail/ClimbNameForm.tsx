import { useState, type FormEvent } from 'react';
import type { ClimbDetail } from '@/shared/api/client';
import { climbTitle } from '@/shared/lib/climbs';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useRenameClimb } from '../../api';

type ClimbNameFormProps = {
  climb: ClimbDetail;
  onDone: () => void;
};

/** Renames a climb; an empty name removes it. */
export const ClimbNameForm = ({ climb, onDone }: ClimbNameFormProps) => {
  const rename = useRenameClimb();
  const [value, setValue] = useState(climb.name ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    rename.mutate({ id: climb.id, name: value }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="mt-1 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="climb-name">
        Climb name
      </label>
      <input
        id="climb-name"
        autoFocus
        value={value}
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone();
        }}
        placeholder={climbTitle({ ...climb, name: null })}
        className="min-w-64 rounded-lg border border-line bg-surface-1 px-2 py-1 text-lg font-semibold text-ink"
      />
      <button
        type="submit"
        disabled={rename.isPending}
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0"
      >
        Save
      </button>
      <button type="button" onClick={onDone} className="px-2 py-1.5 text-sm text-ink-2 hover:underline">
        Cancel
      </button>
      <span className="text-xs text-ink-3">Leave empty to remove the name.</span>
      {rename.error && <ErrorMessage error={rename.error} />}
    </form>
  );
};
