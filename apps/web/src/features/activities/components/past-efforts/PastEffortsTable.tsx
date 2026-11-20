import { Link } from '@tanstack/react-router';
import { formatDate, formatEf, formatHeartRate, formatPercentChange, formatPower } from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import type { EffortRow } from '../../lib/pastEfforts';

type PastEffortsTableProps = {
  /** Newest first. */
  rows: readonly EffortRow[];
  /** The ride being viewed; the other rows link to a comparison with it. */
  activityId: string;
};

/** Every effort on the workout: its power, heart rate and power per heartbeat, and how it felt. */
export const PastEffortsTable = ({ rows, activityId }: PastEffortsTableProps) => (
  <DataTable
    rows={rows}
    rowKey={(row) => row.effort.activityId}
    rowClassName={(row) => (row.isCurrent ? 'font-medium' : '')}
    caption="Efforts on this workout, newest first"
    columns={[
      {
        key: 'date',
        header: 'Date',
        cell: (row) => <EffortDate row={row} />,
      },
      { key: 'power', header: 'Power', align: 'right', cell: (row) => formatPower(row.power) },
      { key: 'hr', header: 'Heart rate', align: 'right', cell: (row) => formatHeartRate(row.hr) },
      {
        key: 'efficiency',
        header: 'W per beat',
        align: 'right',
        title: 'Power divided by heart rate',
        cell: (row) => formatEf(row.wattsPerBeat),
      },
      {
        key: 'change',
        header: 'Change',
        align: 'right',
        title: 'Power per heartbeat against the median of up to five efforts before it',
        cell: (row) => (row.effort.change ? formatPercentChange(row.effort.change.efficiencyPct) : null),
      },
      {
        key: 'rating',
        header: 'Effort',
        align: 'right',
        title: 'How hard it felt, 1–10',
        cell: (row) => (row.rating === null ? null : `${row.rating}/10`),
      },
      {
        key: 'compare',
        header: <span className="sr-only">Compare</span>,
        align: 'right',
        cell: (row) =>
          row.isCurrent ? (
            // An empty element rather than null, which the table would show as a dash.
            <span />
          ) : (
            <Link
              to="/compare"
              search={{ a: activityId, b: row.effort.activityId }}
              className="text-xs font-normal text-ink-2 hover:text-ink hover:underline"
            >
              Compare →
            </Link>
          ),
      },
    ]}
  />
);

const EffortDate = ({ row }: { row: EffortRow }) => {
  const { effort, isCurrent, isCutShort } = row;
  const notes: string[] = [];
  if (isCurrent) notes.push('this ride');
  if (isCutShort) notes.push('cut short');
  if (effort.isManual) notes.push('placed by hand');

  return (
    <>
      {isCurrent ? (
        formatDate(effort.date)
      ) : (
        <Link to="/activities/$activityId" params={{ activityId: effort.activityId }} className="hover:underline">
          {formatDate(effort.date)}
        </Link>
      )}
      {notes.length > 0 && <span className="ml-2 text-xs font-normal text-ink-3">{notes.join(', ')}</span>}
    </>
  );
};
