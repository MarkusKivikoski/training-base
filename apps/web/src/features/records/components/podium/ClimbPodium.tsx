import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useClimbs } from '@/shared/api/climbs';
import { formatDate } from '@/shared/lib/formatters';
import { MEDAL_BG } from '@/shared/ui/medals';
import type { RecordEntry } from '../../types';
import { RankedValue } from './RankedValue';

type ClimbPodiumProps = {
  title: string;
  entries: readonly RecordEntry[];
  value: (entry: RecordEntry) => string;
  detail: (entry: RecordEntry) => string;
};

/** Top 3 climbs, each linking to its climb page; the link shows the name you gave it, if any. */
export const ClimbPodium = ({ title, entries, value, detail }: ClimbPodiumProps) => {
  const climbs = useClimbs();
  const namesById = useMemo(
    () => new Map((climbs.data?.climbs ?? []).map((climb) => [climb.id, climb.name])),
    [climbs.data],
  );

  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-ink-2">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-3">—</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={entry.id ?? i} className={`min-w-0 rounded-md px-2 py-1 ${MEDAL_BG[i]}`}>
              <div className="flex items-baseline gap-2">
                <RankedValue rank={i} value={value(entry)} />
                <span className="truncate text-xs text-ink-2">{detail(entry)}</span>
              </div>
              <div className="truncate pl-9 text-xs text-ink-2">
                <Link to="/climbs/$climbId" params={{ climbId: entry.id! }} className="text-ink hover:underline">
                  {namesById.get(entry.id ?? '') ?? 'Unnamed climb'}
                </Link>
                <span> · {formatDate(entry.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
