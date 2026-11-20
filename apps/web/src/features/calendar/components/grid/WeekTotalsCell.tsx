import { weekTotals } from '@app/metrics';
import type { ReactNode } from 'react';
import type { Activity } from '@/shared/api/client';
import type { PlanProgress } from '../../lib/planMatching';
import { formatDistance, formatDuration, formatTss } from '@/shared/lib/formatters';

type WeekTotalsCellProps = {
  activities: readonly Activity[];
  /** Planned TSS still ahead this week (0 when nothing is planned). */
  plannedTss: number;
  /** Planned sessions done out of those due by today. */
  progress: PlanProgress;
  /** A control in the top-right corner, e.g. a copy button. */
  action?: ReactNode;
};

/** The week column: riding time, outdoor distance, rides and TSS; gym sessions; planned sessions done, and the TSS still planned. */
export const WeekTotalsCell = ({ activities, plannedTss, progress, action }: WeekTotalsCellProps) => {
  const totals = weekTotals(activities);

  return (
    <div className="relative bg-surface-0/40 p-2 text-xs">
      {action && <span className="absolute right-1 top-1">{action}</span>}
      {totals.rides === 0 ? (
        <span className="text-ink-3">—</span>
      ) : (
        <span className="space-y-0.5">
          <span className="block font-semibold tabular-nums">{formatDuration(totals.movingS)}</span>
          {totals.outdoorDistanceM > 0 && (
            <span className="block tabular-nums text-ink-2">{formatDistance(totals.outdoorDistanceM, 0)}</span>
          )}
          <span className="block text-ink-3">
            {totals.rides} {totals.rides === 1 ? 'ride' : 'rides'}
            {totals.tss > 0 && ` · TSS ${formatTss(totals.tss)}`}
          </span>
        </span>
      )}
      {totals.gymSessions > 0 && (
        <span className="mt-1 block text-ink-3">
          {totals.gymSessions} {totals.gymSessions === 1 ? 'gym session' : 'gym sessions'}
        </span>
      )}
      {progress.due > 0 && (
        <span className="mt-1 block text-ink-3">
          Plan · {progress.done} of {progress.due} done
        </span>
      )}
      {plannedTss > 0 && <span className="mt-1 block text-ink-3">Planned · {formatTss(plannedTss)} TSS</span>}
    </div>
  );
};
