import { formatDate } from '@/shared/lib/formatters';
import { SETTING_KIND_INFO, type SettingKind } from '../../constants';
import type { EntryFormState } from '../../hooks/useEntryForm';

const FIELD_CLASS = 'rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink';

type EntryFormProps = {
  kind: SettingKind;
  form: EntryFormState;
  today: string;
  /** Whether an entry already exists on the chosen date, so saving replaces it. */
  isReplacing: boolean;
};

/** Adds an entry, or replaces the one on the same date. */
export const EntryForm = ({ kind, form, today, isReplacing }: EntryFormProps) => {
  const info = SETTING_KIND_INFO[kind];
  const isInvalid = form.valueText !== '' && !form.isValid;

  return (
    <form onSubmit={form.submit} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
      <label className="flex flex-col gap-1 text-xs text-ink-2">
        From
        <input
          type="date"
          value={form.from}
          max={today}
          onChange={(event) => form.setFrom(event.target.value)}
          required
          className={FIELD_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-2">
        {info.label}
        <input
          inputMode="decimal"
          value={form.valueText}
          onChange={(event) => form.setValueText(event.target.value)}
          placeholder={`${info.min}–${info.max}`}
          aria-invalid={isInvalid}
          className={`${FIELD_CLASS} w-24 tabular-nums`}
        />
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-ink-2">
        Note (optional)
        <input
          value={form.note}
          maxLength={120}
          onChange={(event) => form.setNote(event.target.value)}
          placeholder={info.notePlaceholder}
          className={FIELD_CLASS}
        />
      </label>
      {kind === 'lthr' && (
        <label className="flex items-center gap-2 pb-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={form.isEstimated}
            onChange={(event) => form.setIsEstimated(event.target.checked)}
            className="size-4 accent-[var(--series-1)]"
          />
          Estimated
        </label>
      )}
      <button
        type="submit"
        disabled={!form.isValid || form.isSaving}
        className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
      >
        {isReplacing ? `Replace ${formatDate(form.from)} entry` : 'Add entry'}
      </button>
    </form>
  );
};
