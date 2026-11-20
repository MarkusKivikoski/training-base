import type { RecordEntry } from '../../types';
import { PodiumPlace } from './PodiumPlace';

export type PodiumRow = { label: string; entries: readonly RecordEntry[] };

type PodiumTableProps = {
  rows: readonly PodiumRow[];
  value: (entry: RecordEntry) => string;
  detail: (entry: RecordEntry) => string | null;
};

/**
 * Rows of records (distances, durations) with 1st / 2nd / 3rd side by side on wider screens,
 * stacked under the row label on phones.
 */
export const PodiumTable = ({ rows, value, detail }: PodiumTableProps) => (
  // Each place carries its own rank label, so there's no header row to repeat it.
  <div role="table" className="text-sm">
    {rows.map((row) => (
      <div
        role="row"
        key={row.label}
        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border-t border-line py-2 md:grid-cols-[5rem_repeat(3,minmax(0,1fr))]"
      >
        <span role="rowheader" className="font-semibold">
          {row.label}
        </span>
        {row.entries.length === 0 ? (
          <span role="cell" className="text-ink-3">
            —
          </span>
        ) : (
          <div className="contents max-md:block max-md:space-y-2">
            {row.entries.map((entry, i) => (
              <div role="cell" key={`${entry.date}-${entry.id ?? i}`}>
                <PodiumPlace rank={i} entry={entry} value={value(entry)} detail={detail(entry)} />
              </div>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
);
