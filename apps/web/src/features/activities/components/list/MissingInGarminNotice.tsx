import { Link } from '@tanstack/react-router';
import { formatDate } from '@/shared/lib/formatters';

type MissingActivity = { id: string; date: string; name: string };

type MissingInGarminNoticeProps = {
  missing: readonly MissingActivity[];
  /** When `npm run check-deleted` last ran (ISO timestamp), if known. */
  checkedAt: string | null | undefined;
};

/** Lists cached activities that Garmin Connect no longer has, and how to quarantine them. */
export const MissingInGarminNotice = ({ missing, checkedAt }: MissingInGarminNoticeProps) => {
  if (missing.length === 0) return null;

  const subject = missing.length === 1 ? 'activity was' : 'activities were';
  const checkedText = checkedAt ? ` (checked ${formatDate(checkedAt.slice(0, 10))})` : '';

  return (
    <div role="status" className="mb-4 rounded-xl border border-line bg-surface-1 p-4 text-sm">
      <p className="text-ink">
        <span aria-hidden className="mr-1 font-bold text-status-warning">
          ▲
        </span>
        {missing.length} cached {subject} not found in Garmin Connect
        {checkedText}, probably deleted there:
      </p>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
        {missing.map((activity) => (
          <li key={activity.id}>
            <Link
              to="/activities/$activityId"
              params={{ activityId: activity.id }}
              className="hover:text-ink hover:underline"
            >
              {formatDate(activity.date)} · {activity.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-ink-3">
        To remove them, run <code>npm run check-deleted -- --quarantine</code> (moves their files to data/quarantine/;
        nothing is deleted).
      </p>
    </div>
  );
};
