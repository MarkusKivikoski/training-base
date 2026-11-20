import { Link } from '@tanstack/react-router';
import type { Activity } from '@/shared/api/client';
import { formatSport } from '@/shared/lib/formatters';
import { entryDetail, entryKind, entryTss } from '../lib/calendarDays';

type ActivityEntryProps = {
  activity: Activity;
  /** Smaller ride names, for the month grid. */
  compact?: boolean;
};

type ActivityMarkerProps = {
  activity: Activity;
};

/** The same markers as the Activities list: blue indoor ride, orange outdoor ride, grey ring otherwise. */
const ActivityMarker = ({ activity }: ActivityMarkerProps) => {
  if (!activity.isCycling) {
    return <span aria-hidden className="mt-1 inline-block size-2 shrink-0 rounded-full border border-ink-3" />;
  }
  const color = activity.isIndoor ? 'bg-series-1' : 'bg-series-2';
  return <span aria-hidden className={`mt-0.5 inline-block h-3 w-1 shrink-0 rounded-full ${color}`} />;
};

/**
 * One activity in a day: rides with name, time (and distance outdoors) and TSS, other activities
 * in one line.
 */
export const ActivityEntry = ({ activity, compact = false }: ActivityEntryProps) => {
  const tss = entryTss(activity);

  return (
    <Link
      to="/activities/$activityId"
      params={{ activityId: activity.id }}
      title={`${activity.name} · ${entryKind(activity)}`}
      className={`flex gap-1.5 rounded-md px-1 py-0.5 hover:bg-surface-0 ${activity.isCycling ? '' : 'opacity-80'}`}
    >
      <ActivityMarker activity={activity} />
      <span className="min-w-0">
        {activity.isCycling ? (
          <>
            <span className={`block truncate font-medium text-ink ${compact ? 'text-xs' : 'text-sm'}`}>
              {activity.name}
            </span>
            <span className="block text-xs tabular-nums text-ink-2">{entryDetail(activity)}</span>
            {tss && <span className="block text-xs tabular-nums text-ink-3">{tss}</span>}
          </>
        ) : (
          <span className="block truncate text-xs text-ink-2">
            {formatSport(activity.sport)} · {entryDetail(activity)}
          </span>
        )}
      </span>
    </Link>
  );
};
