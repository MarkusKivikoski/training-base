import type { RecordEntry } from '../../types';
import { PodiumPlace } from './PodiumPlace';

type PodiumListProps = {
  title: string;
  entries: readonly RecordEntry[];
  value: (entry: RecordEntry) => string;
};

/** A record's name with its top 3 stacked. */
export const PodiumList = ({ title, entries, value }: PodiumListProps) => (
  <section>
    <h3 className="mb-2 text-xs font-medium text-ink-2">{title}</h3>
    {entries.length === 0 ? (
      <p className="text-sm text-ink-3">—</p>
    ) : (
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <PodiumPlace key={`${entry.date}-${entry.id ?? i}`} rank={i} entry={entry} value={value(entry)} />
        ))}
      </div>
    )}
  </section>
);
