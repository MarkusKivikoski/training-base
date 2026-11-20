import { DataTable } from '@/shared/ui/DataTable';
import { SETTING_KIND_INFO, type SettingKind } from '../../constants';
import { effectiveRange, type SettingEntry } from '../../lib/settingEntries';

type HistoryTableProps = {
  kind: SettingKind;
  /** Oldest first; shown newest first. */
  entries: SettingEntry[];
  isRemoving: boolean;
  onEdit: (entry: SettingEntry) => void;
  onRemove: (entry: SettingEntry) => void;
};

/** A setting's entries with when each was in effect, and Edit / Remove buttons. */
export const HistoryTable = ({ kind, entries, isRemoving, onEdit, onRemove }: HistoryTableProps) => {
  const info = SETTING_KIND_INFO[kind];

  return (
    <DataTable
      rows={[...entries].reverse()}
      rowKey={(entry) => entry.from}
      empty={<p className="mb-3 text-sm text-ink-3">No entries yet.</p>}
      columns={[
        { key: 'range', header: 'In effect', cell: (entry) => effectiveRange(entry, entries) },
        {
          key: 'value',
          header: info.short,
          align: 'right',
          className: 'font-semibold',
          cell: (entry) => `${entry.value} ${info.unit}`,
        },
        {
          key: 'source',
          header: 'Source',
          hidden: kind === 'weight',
          className: 'text-ink-2',
          cell: (entry) => (entry.source === 'estimated' ? 'Estimated' : 'Set by you'),
        },
        { key: 'note', header: 'Note', className: 'text-ink-2', cell: (entry) => entry.note },
        {
          key: 'actions',
          header: <span className="sr-only">Actions</span>,
          align: 'right',
          cell: (entry) => (
            <span className="inline-flex gap-3 text-xs">
              <button type="button" onClick={() => onEdit(entry)} className="text-ink-2 hover:text-ink hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry)}
                disabled={isRemoving}
                className="text-ink-2 hover:text-status-critical hover:underline"
              >
                Remove
              </button>
            </span>
          ),
        },
      ]}
    />
  );
};
