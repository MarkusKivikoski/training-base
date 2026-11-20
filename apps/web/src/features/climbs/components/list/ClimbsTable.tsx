import { Link } from '@tanstack/react-router';
import type { ClimbSummary } from '@/shared/api/client';
import { climbTitle } from '@/shared/lib/climbs';
import { formatClock, formatDate, formatElevation, formatGrade } from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import { climbLengthText, type SortKey } from '../../lib/climbList';
import { SortButton } from './SortButton';

type ClimbsTableProps = {
  climbs: ClimbSummary[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
};

/** The climbs with their length, grades, gain, rides, best time and when last ridden. */
export const ClimbsTable = ({ climbs, sort, onSort }: ClimbsTableProps) => {
  const header = (key: SortKey, label: string) => (
    <SortButton sortKey={key} current={sort} label={label} onSort={onSort} />
  );
  const ariaSort = (key: SortKey) => (key === sort ? ('descending' as const) : undefined);

  return (
    <DataTable
      rows={climbs}
      rowKey={(climb) => climb.id}
      columns={[
        {
          key: 'climb',
          header: 'Climb',
          cell: (climb) => (
            <Link to="/climbs/$climbId" params={{ climbId: climb.id }} className="font-medium text-ink hover:underline">
              {climbTitle(climb)}
            </Link>
          ),
        },
        {
          key: 'lengthM',
          header: header('lengthM', 'Length'),
          sort: ariaSort('lengthM'),
          align: 'right',
          cell: (climb) => climbLengthText(climb.lengthM),
        },
        {
          key: 'avgGrade',
          header: header('avgGrade', 'Avg grade'),
          sort: ariaSort('avgGrade'),
          align: 'right',
          cell: (climb) => formatGrade(climb.avgGrade),
        },
        {
          key: 'maxGrade',
          header: header('maxGrade', 'Max grade'),
          sort: ariaSort('maxGrade'),
          align: 'right',
          className: 'text-ink-2',
          cell: (climb) => formatGrade(climb.maxGrade),
        },
        {
          key: 'gain',
          header: header('score', 'Gain'),
          sort: ariaSort('score'),
          align: 'right',
          cell: (climb) => formatElevation(climb.gainM),
        },
        {
          key: 'rides',
          header: header('rides', 'Rides'),
          sort: ariaSort('rides'),
          align: 'right',
          cell: (climb) => (
            <>
              {climb.rides}
              {climb.efforts > climb.rides && <span className="text-ink-3"> ({climb.efforts}×)</span>}
            </>
          ),
        },
        {
          key: 'best',
          header: 'Best time',
          align: 'right',
          cell: (climb) => (
            <>
              <Link
                to="/activities/$activityId"
                params={{ activityId: climb.best.activityId }}
                className="hover:underline"
              >
                {formatClock(climb.best.timeS)}
              </Link>
              <span className="block text-[11px] text-ink-3">{formatDate(climb.best.date)}</span>
            </>
          ),
        },
        {
          key: 'lastDate',
          header: header('lastDate', 'Last ridden'),
          sort: ariaSort('lastDate'),
          align: 'right',
          className: 'text-ink-2',
          cell: (climb) => formatDate(climb.lastDate),
        },
      ]}
    />
  );
};
