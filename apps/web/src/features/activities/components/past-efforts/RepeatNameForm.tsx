import { useState, type FormEvent } from 'react';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useRenameRepeat } from '../../api';

type RepeatNameFormProps = {
  /** The workout's or route's id. */
  groupId: string;
  name: string | null;
  /** The label shown when there is no name, as the placeholder. */
  placeholder: string;
  noun: 'workout' | 'route';
  onDone: () => void;
};

/** Renames a workout or a route; an empty name removes it. */
export const RepeatNameForm = ({ groupId, name, placeholder, noun, onDone }: RepeatNameFormProps) => {
  const rename = useRenameRepeat();
  const [value, setValue] = useState(name ?? '');
  const inputId = `${noun}-name`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    rename.mutate({ id: groupId, name: value }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={inputId}>
        Name of the {noun}
      </label>
      <input
        id={inputId}
        autoFocus
        value={value}
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone();
        }}
        placeholder={placeholder}
        className="min-w-64 rounded-lg border border-line bg-surface-1 px-2 py-1 text-sm font-semibold text-ink"
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
