import type { WeeklyLoadTrend } from '@app/metrics';
import { formatTss } from '@/shared/lib/formatters';
import { formatRatio } from '../../lib/zoneText';
import { StatusChip } from '../StatusChip';

type WeeklyLoadSummaryProps = {
  trend: WeeklyLoadTrend;
};

/** "+12%", or a dash before there's enough history. */
const formatChange = (ratio: number | null) => {
  if (ratio === null) return '—';
  const percent = Math.round((ratio - 1) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
};

/** The last 7 days' TSS, the usual week, and the change between them with its status. */
export const WeeklyLoadSummary = ({ trend }: WeeklyLoadSummaryProps) => {
  const ratio = trend.status.baseline ? null : trend.status.value;

  return (
    <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-ink-2">Last 7 days</dt>
        <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatTss(trend.last7)} TSS</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-2">Usual week (4 weeks before)</dt>
        <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatTss(trend.usualWeek)} TSS</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-2">Change</dt>
        <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatChange(ratio)}</dd>
        <dd className="mt-1">
          <StatusChip
            status={trend.status}
            baselineUntil={trend.readyFrom}
            detail={ratio === null ? undefined : `${formatRatio(ratio)} usual`}
          />
        </dd>
      </div>
    </dl>
  );
};
