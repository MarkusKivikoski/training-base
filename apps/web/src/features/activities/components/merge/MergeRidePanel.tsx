import { useNavigate } from '@tanstack/react-router';
import { formatDateTime, formatDistance, formatDuration } from '@/shared/lib/formatters';
import { useMergeCandidates, useMergeRides, type MergeCandidate } from '../../api';

type MergeRidePanelProps = {
  activityId: string;
};

const BUTTON_CLASS =
  'rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0 disabled:opacity-50';

const gapLabel = (candidate: MergeCandidate) => {
  const isRightAway = candidate.gapS < 60;
  if (isRightAway) return candidate.isBefore ? 'ended right before this one' : 'started right after this one';
  const gap = formatDuration(candidate.gapS);
  return candidate.isBefore ? `ended ${gap} before this one` : `started ${gap} after this one`;
};

/**
 * For a ride whose recording was stopped by accident: joins it with a recording just before or
 * after it. Shown only when there is one; folded away until opened.
 */
export const MergeRidePanel = ({ activityId }: MergeRidePanelProps) => {
  const candidates = useMergeCandidates(activityId);
  const merge = useMergeRides();
  const navigate = useNavigate();

  if (!candidates.data || candidates.data.length === 0) return null;

  const mergeWith = (candidate: MergeCandidate) =>
    merge.mutate(
      { ids: [activityId, candidate.id] },
      {
        onSuccess: () => {
          // The merged ride keeps the earliest recording's id, so this page's id goes away.
          if (candidate.isBefore) {
            void navigate({ to: '/activities/$activityId', params: { activityId: candidate.id } });
          }
        },
      },
    );

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-ink-2 hover:text-ink">
        Recording stopped mid-ride? Merge with another recording
      </summary>
      <p className="mt-2 text-xs text-ink-3">
        The recordings become one ride here; Garmin Connect keeps them apart. The merged ride keeps the earlier
        recording’s note, rating, bike and workout type. You can split it again at any time.
      </p>
      <ul className="mt-2 space-y-2">
        {candidates.data.map((candidate) => (
          <li key={candidate.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-ink">{candidate.name}</span>
            <span className="text-xs text-ink-2">
              {formatDateTime(candidate.startTimeLocal)} · {formatDuration(candidate.durationS)} ·{' '}
              {formatDistance(candidate.distanceM)} · {gapLabel(candidate)}
            </span>
            <button
              type="button"
              disabled={merge.isPending || merge.isSuccess}
              onClick={() => mergeWith(candidate)}
              className={BUTTON_CLASS}
            >
              Merge
            </button>
          </li>
        ))}
      </ul>
      {merge.isSuccess && (
        <p className="mt-2 text-xs text-ink-3">Merging. This page refreshes when the ride is recomputed.</p>
      )}
      {merge.error && (
        <p role="alert" className="mt-2 text-xs text-ink-2">
          Couldn’t merge the rides: {merge.error.message}
        </p>
      )}
    </details>
  );
};
