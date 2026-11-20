import { useState } from 'react';
import { formatDate } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useRemoveSetting } from '../../api';
import { SETTING_KIND_INFO, type SettingKind } from '../../constants';
import { useEntryForm } from '../../hooks/useEntryForm';
import { currentEntry, type SettingEntry } from '../../lib/settingEntries';
import { EntryForm } from './EntryForm';
import { HistoryTable } from './HistoryTable';
import { SettingRule } from './SettingRule';

type HistoryCardProps = {
  kind: SettingKind;
  /** Oldest first. */
  entries: SettingEntry[];
  today: string;
};

/** One setting's history: the value now, every entry, a form to add or replace one, and how it's used. */
export const HistoryCard = ({ kind, entries, today }: HistoryCardProps) => {
  const info = SETTING_KIND_INFO[kind];
  const form = useEntryForm(kind, today);
  const remove = useRemoveSetting();
  const [removing, setRemoving] = useState<SettingEntry | null>(null);
  const current = currentEntry(entries, today);
  const isReplacing = entries.some((entry) => entry.from === form.from);

  const removeEntry = () => {
    setRemoving(null);
    if (removing) remove.mutate({ kind, from: removing.from });
  };

  return (
    <Card
      title={info.title}
      action={
        current ? (
          <span className="text-sm text-ink-2">
            Now:{' '}
            <span className="font-semibold text-ink">
              {current.value} {info.unit}
            </span>
          </span>
        ) : undefined
      }
    >
      <HistoryTable
        kind={kind}
        entries={entries}
        isRemoving={remove.isPending}
        onEdit={form.edit}
        onRemove={setRemoving}
      />
      <EntryForm kind={kind} form={form} today={today} isReplacing={isReplacing} />
      {(form.saveError || remove.error) && <ErrorMessage error={form.saveError ?? remove.error} />}
      <p className="mt-3 text-xs text-ink-3">
        <SettingRule kind={kind} firstFrom={entries[0]?.from ?? null} />
      </p>
      {removing && (
        <ConfirmationModal
          title={`Remove ${info.short} ${removing.value} ${info.unit} from ${formatDate(removing.from)}?`}
          message="Your stats will be recomputed."
          confirmLabel="Remove"
          isDestructive
          onConfirm={removeEntry}
          onCancel={() => setRemoving(null)}
        />
      )}
    </Card>
  );
};
