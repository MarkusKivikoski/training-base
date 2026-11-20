import { Link } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Activity, ActivitySortColumn, SortOrder } from '@/shared/api/client';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatPower,
  formatSport,
} from '@/shared/lib/formatters';
import { DataTable } from './DataTable';
import { EnvironmentBadge } from './EnvironmentBadge';
import { SortHeader } from './SortHeader';
import { WorkoutTypeBadge } from './WorkoutTypeBadge';

/** Sortable column headings. The rows arrive already sorted; this only shows and changes the sort. */
export type ActivityListSort = {
  column: ActivitySortColumn;
  order: SortOrder;
  onSort: (column: ActivitySortColumn) => void;
};

/** Checkbox selection of rows, by activity id. */
export type ActivitySelection = {
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Select every listed activity, or clear the selection. */
  onToggleAll: (selectAll: boolean) => void;
};

type ActivityListProps = {
  activities: Activity[];
  /** Fewer columns, and the table only from `lg` up (for cards on the Overview). */
  compact?: boolean;
  /** Adds a checkbox to each row. */
  selection?: ActivitySelection;
  /** A control at the end of each row, e.g. a copy button. */
  rowAction?: (activity: Activity) => ReactNode;
  /** Makes the column headings sort the list. */
  sort?: ActivityListSort;
};

/** Activities as a table on wider screens and as stacked rows on phones, each linking to its page. */
export const ActivityList = ({ activities, compact = false, selection, rowAction, sort }: ActivityListProps) => {
  const header = (column: ActivitySortColumn, label: string) => {
    if (!sort) return label;
    return (
      <SortHeader
        label={label}
        isActive={sort.column === column}
        order={sort.order}
        onClick={() => sort.onSort(column)}
      />
    );
  };
  const ariaSort = (column: ActivitySortColumn) => {
    if (sort?.column !== column) return undefined;
    return sort.order === 'asc' ? ('ascending' as const) : ('descending' as const);
  };

  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        No activities yet. Run <code>npm run sync</code>.
      </p>
    );
  }

  return (
    <>
      <DataTable
        wrapperClassName={compact ? 'hidden lg:block' : 'hidden md:block'}
        density="comfortable"
        rows={activities}
        rowKey={(activity) => activity.id}
        rowClassName={() => 'hover:bg-surface-0'}
        columns={[
          {
            key: 'select',
            hidden: !selection,
            header: selection && <SelectAllCheckbox activities={activities} selection={selection} />,
            headerClassName: 'w-8',
            cell: (activity) => selection && <RowCheckbox activity={activity} selection={selection} />,
          },
          {
            key: 'date',
            header: header('date', 'Date'),
            sort: ariaSort('date'),
            headerClassName: 'pr-3',
            className: 'whitespace-nowrap pr-3 text-ink-2',
            cell: (activity) => formatDate(activity.date),
          },
          {
            key: 'activity',
            header: header('name', 'Activity'),
            sort: ariaSort('name'),
            headerClassName: 'pr-3',
            className: 'pr-3',
            cell: (activity) => (
              <>
                <Link
                  to="/activities/$activityId"
                  params={{ activityId: activity.id }}
                  className="font-medium hover:underline"
                >
                  {activity.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-3">
                  <EnvironmentBadge
                    isIndoor={activity.isIndoor}
                    isCycling={activity.isCycling}
                    sport={activity.sport}
                  />
                  {activity.isCycling && <span className="text-xs text-ink-3">{formatSport(activity.sport)}</span>}
                </div>
              </>
            ),
          },
          {
            key: 'workoutType',
            header: header('workoutType', 'Type'),
            sort: ariaSort('workoutType'),
            headerClassName: 'pr-3',
            className: 'pr-3 text-sm',
            cell: (activity) => <WorkoutTypeBadge activity={activity} />,
          },
          {
            key: 'duration',
            header: header('duration', 'Duration'),
            sort: ariaSort('duration'),
            align: 'right',
            headerClassName: 'pr-3',
            className: 'pr-3',
            cell: (activity) => formatDuration(activity.durationS),
          },
          {
            key: 'distance',
            header: header('distance', 'Distance'),
            sort: ariaSort('distance'),
            align: 'right',
            headerClassName: 'pr-3',
            className: 'pr-3',
            cell: (activity) => formatDistance(activity.distanceM),
          },
          {
            key: 'elevation',
            header: header('elevation', 'Elevation'),
            sort: ariaSort('elevation'),
            align: 'right',
            hidden: compact,
            headerClassName: 'pr-3',
            className: 'pr-3',
            cell: (activity) => (activity.isIndoor ? null : formatElevation(activity.elevationGainM)),
          },
          {
            key: 'hr',
            header: header('hr', 'Avg HR'),
            sort: ariaSort('hr'),
            align: 'right',
            headerClassName: 'pr-3',
            className: 'pr-3',
            cell: (activity) => formatHeartRate(activity.avgHr),
          },
          {
            key: 'power',
            header: header('power', 'Avg power'),
            sort: ariaSort('power'),
            align: 'right',
            cell: (activity) => formatPower(activity.avgPower),
          },
          {
            key: 'action',
            hidden: !rowAction,
            header: <span className="sr-only">Actions</span>,
            className: 'w-10 pl-2 text-right',
            cell: (activity) => rowAction?.(activity),
          },
        ]}
      />

      <ul className={`divide-y divide-line ${compact ? 'lg:hidden' : 'md:hidden'}`}>
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-center gap-3">
            {selection && <RowCheckbox activity={activity} selection={selection} />}
            <Link
              to="/activities/$activityId"
              params={{ activityId: activity.id }}
              className="block min-w-0 flex-1 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium">{activity.name}</span>
                <span className="shrink-0 text-xs text-ink-3">{formatDate(activity.date)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                <EnvironmentBadge isIndoor={activity.isIndoor} isCycling={activity.isCycling} sport={activity.sport} />
                <WorkoutTypeBadge activity={activity} />
                <span>{formatDuration(activity.durationS)}</span>
                {activity.distanceM ? <span>{formatDistance(activity.distanceM)}</span> : null}
                {activity.avgPower != null && <span>{formatPower(activity.avgPower)}</span>}
                {activity.avgHr != null && <span>{formatHeartRate(activity.avgHr)}</span>}
              </div>
            </Link>
            {rowAction?.(activity)}
          </li>
        ))}
      </ul>
    </>
  );
};

type RowCheckboxProps = { activity: Activity; selection: ActivitySelection };

const RowCheckbox = ({ activity, selection }: RowCheckboxProps) => (
  <input
    type="checkbox"
    aria-label={`Select ${activity.name}`}
    checked={selection.selectedIds.has(activity.id)}
    onChange={() => selection.onToggle(activity.id)}
    className="block size-4 accent-current"
  />
);

type SelectAllCheckboxProps = { activities: Activity[]; selection: ActivitySelection };

/** Checked when every listed activity is selected, half-checked when some are. */
const SelectAllCheckbox = ({ activities, selection }: SelectAllCheckboxProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = activities.filter((activity) => selection.selectedIds.has(activity.id)).length;
  const isAllSelected = selectedCount > 0 && selectedCount === activities.length;
  const isPartlySelected = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = isPartlySelected;
  }, [isPartlySelected]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      aria-label="Select all listed activities"
      checked={isAllSelected}
      onChange={() => selection.onToggleAll(!isAllSelected)}
      className="block size-4 accent-current"
    />
  );
};
