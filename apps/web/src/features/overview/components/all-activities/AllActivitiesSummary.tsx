import { formatLoad, formatTss } from '@/shared/lib/formatters';
import { WEEKS_SHOWN } from '../../constants';

type AllActivitiesSummaryProps = {
  lastSevenDays: { cycling: number; other: number };
  cyclingCtl: number | null;
  allActivitiesCtl: number | null;
  otherSports: { withLoad: number; withoutLoad: number };
};

/** The last 7 days' load, fitness with and without other sports, and how many other-sport activities count. */
export const AllActivitiesSummary = ({
  lastSevenDays,
  cyclingCtl,
  allActivitiesCtl,
  otherSports,
}: AllActivitiesSummaryProps) => {
  const otherSportsNote =
    otherSports.withoutLoad > 0
      ? `${otherSports.withoutLoad} with heart rate before your first LTHR`
      : 'All with heart rate are counted';

  return (
    <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-ink-2">Last 7 days</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
          {formatTss(lastSevenDays.cycling + lastSevenDays.other)} TSS
        </dd>
        <dd className="text-xs text-ink-3">
          {formatTss(lastSevenDays.cycling)} cycling · {formatTss(lastSevenDays.other)} other sports
        </dd>
      </div>
      <div>
        <dt className="text-xs text-ink-2">Fitness, all activities</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{formatLoad(allActivitiesCtl)}</dd>
        <dd className="text-xs text-ink-3">Cycling only: {formatLoad(cyclingCtl)}</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-2">Other sports, last {WEEKS_SHOWN} weeks</dt>
        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{otherSports.withLoad} with load</dd>
        <dd className="text-xs text-ink-3">{otherSportsNote}</dd>
      </div>
    </dl>
  );
};
