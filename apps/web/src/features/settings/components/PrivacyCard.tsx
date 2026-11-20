import { useState, type FormEvent } from 'react';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useSetPrivacyTrim } from '../api';
import { isValidPrivacyTrim } from '../lib/settingEntries';

type PrivacyCardProps = {
  /** The saved trim. */
  metres: number;
};

/** How much of each route's start and end the heatmap hides. */
export const PrivacyCard = ({ metres }: PrivacyCardProps) => {
  const setTrim = useSetPrivacyTrim();
  const [text, setText] = useState(String(metres));
  const typed = Number(text);
  const isValid = isValidPrivacyTrim(typed);
  const isChanged = typed !== metres;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid && isChanged) setTrim.mutate(typed);
  };

  return (
    <Card title="Heatmap privacy">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          Hide the first and last
          <span className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={!isValid}
              className="w-24 rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm tabular-nums text-ink"
            />
            <span className="text-sm text-ink-2">metres of every route</span>
          </span>
        </label>
        <button
          type="submit"
          disabled={!isValid || !isChanged || setTrim.isPending}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
        >
          Save
        </button>
      </form>
      {setTrim.error && <ErrorMessage error={setTrim.error} />}
      <p className="mt-3 text-xs text-ink-3">
        Keeps where your rides start and end (home, work) off the heatmap. Currently{' '}
        {metres === 0 ? 'off' : `${metres} m`}. Ride pages always show the full route.
      </p>
    </Card>
  );
};
