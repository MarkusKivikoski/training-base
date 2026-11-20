import { Link } from '@tanstack/react-router';
import { ordinal } from '@/shared/lib/climbs';
import {
  formatClock,
  formatDate,
  formatDistance,
  formatEf,
  formatHeartRate,
  formatPercentChange,
  formatPower,
  formatSpeed,
} from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import { MEDAL_BG } from '@/shared/ui/medals';
import type { RouteEffortRow } from '../../lib/routeEfforts';

type RouteEffortsTableProps = {
  /** Newest first. */
  rows: readonly RouteEffortRow[];
  /** The ride being viewed; the other rows link to a comparison with it. */
  activityId: string;
  /** Whether any effort was ridden with a power meter: the power columns show only then. */
  showPower: boolean;
  /** Whether any effort is tagged with its tyres: the tyres column shows only then. */
  showTyres: boolean;
};

/**
 * Every effort on the route: its moving time, speed, heart rate and rank, and how it felt. Power
 * and power per heartbeat are added when any effort has power, and the tyres when any is tagged.
 */
export const RouteEffortsTable = ({ rows, activityId, showPower, showTyres }: RouteEffortsTableProps) => (
  <DataTable
    rows={rows}
    rowKey={(row) => row.effort.activityId}
    rowClassName={(row) => (row.isCurrent ? 'font-medium' : '')}
    caption="Efforts on this route, newest first"
    maxHeight="max-h-96"
    columns={[
      { key: 'date', header: 'Date', cell: (row) => <EffortDate row={row} /> },
      {
        key: 'tyres',
        header: 'Tyres',
        title: 'Set on the page of each ride',
        hidden: !showTyres,
        className: 'font-normal text-ink-2',
        cell: (row) => row.tyres,
      },
      { key: 'distance', header: 'Distance', align: 'right', cell: (row) => formatDistance(row.effort.distanceM) },
      {
        key: 'time',
        header: 'Moving time',
        align: 'right',
        title: 'Stops (traffic lights, breaks) are left out',
        cell: (row) => formatClock(row.effort.movingS),
      },
      { key: 'speed', header: 'Speed', align: 'right', cell: (row) => formatSpeed(row.effort.speedMps) },
      {
        key: 'power',
        header: 'NP',
        align: 'right',
        title: 'Normalized power',
        hidden: !showPower,
        cell: (row) => (row.effort.np === null ? null : formatPower(row.effort.np)),
      },
      { key: 'hr', header: 'Heart rate', align: 'right', cell: (row) => formatHeartRate(row.effort.avgHr) },
      {
        key: 'efficiency',
        header: 'W per beat',
        align: 'right',
        title: 'Normalized power divided by average heart rate',
        hidden: !showPower,
        cell: (row) => (row.wattsPerBeat === null ? null : formatEf(row.wattsPerBeat)),
      },
      {
        key: 'change',
        header: 'Change',
        align: 'right',
        title: 'Speed against the median of up to five efforts before it',
        cell: (row) => (row.effort.change ? formatPercentChange(row.effort.change.speedPct) : null),
      },
      {
        key: 'rank',
        header: 'Rank',
        align: 'right',
        title: 'By speed, among every effort on this route',
        cell: (row) => <EffortRank rank={row.effort.rank} />,
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

const EffortDate = ({ row }: { row: RouteEffortRow }) => {
  if (row.isCurrent) {
    return (
      <>
        {formatDate(row.effort.date)}
        <span className="ml-2 text-xs font-normal text-ink-3">this ride</span>
      </>
    );
  }
  return (
    <Link to="/activities/$activityId" params={{ activityId: row.effort.activityId }} className="hover:underline">
      {formatDate(row.effort.date)}
    </Link>
  );
};

const EffortRank = ({ rank }: { rank: number }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${MEDAL_BG[rank - 1] ?? ''}`}>{ordinal(rank)}</span>
);
