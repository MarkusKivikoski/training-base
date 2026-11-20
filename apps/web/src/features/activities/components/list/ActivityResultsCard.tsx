import type { Activity } from '@/shared/api/client';
import { MAX_COACH_RIDES } from '@/shared/api/coach';
import { CopyForCoachButton } from '@/shared/coach/CopyForCoachButton';
import { ActivityList, type ActivitySelection } from '@/shared/ui/ActivityList';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import type { SportScope } from '../../constants';
import { useActivitySelection } from '../../hooks/useActivitySelection';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { sortAfterClick, type ActivitySortState } from '../../lib/activitySort';
import { activityNoun, resultsTitle } from '../../lib/listText';
import { SortSelect } from './SortSelect';

type ActivityResultsCardProps = {
  activities: Activity[];
  /** Matching activities in total, once the first page has loaded. */
  total: number | undefined;
  sport: SportScope;
  isFiltered: boolean;
  isPending: boolean;
  error: Error | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  sort: ActivitySortState;
  onSortChange: (next: ActivitySortState) => void;
};

/**
 * The matching activities, with their count as the title and sortable by column; more load as the
 * end of the list scrolls into view. Each row can be copied for a coach, and ticked rows copied
 * together.
 */
export const ActivityResultsCard = ({
  activities,
  total,
  sport,
  isFiltered,
  isPending,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
  sort,
  onSortChange,
}: ActivityResultsCardProps) => {
  const title = total === undefined ? undefined : resultsTitle(total, sport, isFiltered);
  const { selection, selected, clear } = useActivitySelection(activities);
  const hasSelection = selected.length > 0;
  const copyLabel =
    selected.length > MAX_COACH_RIDES ? `Copy first ${MAX_COACH_RIDES}` : `Copy ${selected.length} for coach`;

  const actions = (
    <div className="flex items-center gap-3 text-sm">
      {hasSelection && (
        <>
          <button type="button" onClick={clear} className="text-ink-2 hover:text-ink hover:underline">
            Clear
          </button>
          <CopyForCoachButton activities={selected} label={copyLabel} />
        </>
      )}
      <SortSelect sort={sort} onChange={onSortChange} />
    </div>
  );

  return (
    <Card title={title} action={actions}>
      <ResultsBody
        activities={activities}
        selection={selection}
        sport={sport}
        isPending={isPending}
        error={error}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        sort={sort}
        onSortChange={onSortChange}
      />
    </Card>
  );
};

type ResultsBodyProps = Omit<ActivityResultsCardProps, 'total' | 'isFiltered'> & { selection: ActivitySelection };

const ResultsBody = ({
  activities,
  selection,
  sport,
  isPending,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
  sort,
  onSortChange,
}: ResultsBodyProps) => {
  const sentinelRef = useInfiniteScroll({ hasMore, isLoading: isLoadingMore, onLoadMore });

  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">No {activityNoun(sport)} match these filters.</p>;
  }

  return (
    <>
      <ActivityList
        activities={activities}
        selection={selection}
        rowAction={(activity) => <CopyForCoachButton activities={[activity]} compact />}
        sort={{ ...sort, onSort: (column) => onSortChange(sortAfterClick(sort, column)) }}
      />
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-ink-3">
          {isLoadingMore ? 'Loading more…' : null}
        </div>
      )}
    </>
  );
};
