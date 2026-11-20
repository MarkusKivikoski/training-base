import type { YearTotals } from '@app/metrics';
import { activityMix } from '../lib/yearTotals';

type ActivityMixProps = {
  totals: YearTotals;
};

/** The year's activities by type, as counts and share bars. */
export const ActivityMix = ({ totals }: ActivityMixProps) => {
  const rows = activityMix(totals);
  if (rows.length === 0) return <p className="text-sm text-ink-3">No activities.</p>;

  let total = 0;
  for (const row of rows) total += row.count;

  return (
    <ul className="space-y-2.5 text-sm" aria-label="Activities by type">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex justify-between">
            <span>{row.label}</span>
            <span className="tabular-nums text-ink-2">
              <span className="font-semibold text-ink">{row.count}</span> · {Math.round(row.percent)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-surface-0" aria-hidden>
            <div className="h-full rounded-full bg-series-1" style={{ width: `${row.percent}%` }} />
          </div>
        </li>
      ))}
      <li className="pt-1 text-xs text-ink-3">{total} activities in all.</li>
    </ul>
  );
};
