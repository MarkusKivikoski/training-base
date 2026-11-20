import { Link } from '@tanstack/react-router';
import { climbTitle, ordinal, vam } from '@/shared/lib/climbs';
import {
  formatClock,
  formatElevation,
  formatGrade,
  formatHeartRate,
  formatPower,
  formatSpeed,
  formatVam,
} from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui/DataTable';
import { MEDAL_BG } from '@/shared/ui/medals';
import { useActivityClimbs } from '../../api';
import { bestTimeCount, climbEffortRows, climbsCardTitle, type ClimbEffortRow } from '../../lib/climbEfforts';

type ActivityClimbsCardProps = {
  activityId: string;
};

/**
 * The climbs this ride went up, in ride order, each effort with its rank among every effort on
 * that climb. Renders nothing when the ride has none.
 */
export const ActivityClimbsCard = ({ activityId }: ActivityClimbsCardProps) => {
  const { data: rideClimbs } = useActivityClimbs(activityId);
  if (!rideClimbs || rideClimbs.length === 0) return null;

  const rows = climbEffortRows(rideClimbs);
  const hasPower = rows.some(({ effort }) => effort.avgPower !== null);

  return (
    <Card title={climbsCardTitle(bestTimeCount(rows))} className="lg:col-span-3">
      <DataTable
        rows={rows}
        rowKey={({ climb, effort }) => `${climb.id}-${effort.startS}`}
        columns={[
          {
            key: 'climb',
            header: 'Climb',
            cell: ({ climb }) => (
              <>
                <Link to="/climbs/$climbId" params={{ climbId: climb.id }} className="font-medium hover:underline">
                  {climbTitle(climb)}
                </Link>
                {climb.name && <span className="ml-2 text-xs text-ink-3">{formatGrade(climb.avgGrade)}</span>}
              </>
            ),
          },
          {
            key: 'at',
            header: 'At',
            className: 'tabular-nums text-ink-2',
            cell: ({ effort }) => formatClock(effort.startS),
          },
          { key: 'gain', header: 'Gain', align: 'right', cell: ({ climb }) => formatElevation(climb.gainM) },
          {
            key: 'time',
            header: 'Time',
            align: 'right',
            className: 'font-medium',
            cell: ({ effort }) => formatClock(effort.timeS),
          },
          {
            key: 'speed',
            header: 'Speed',
            align: 'right',
            cell: ({ climb, effort }) => formatSpeed(climb.lengthM / effort.timeS),
          },
          {
            key: 'vam',
            header: 'VAM',
            align: 'right',
            cell: ({ climb, effort }) => formatVam(vam(climb.gainM, effort.timeS)),
          },
          {
            key: 'power',
            header: 'Avg power',
            align: 'right',
            hidden: !hasPower,
            cell: ({ effort }) => formatPower(effort.avgPower),
          },
          { key: 'hr', header: 'Avg HR', align: 'right', cell: ({ effort }) => formatHeartRate(effort.avgHr) },
          { key: 'rank', header: 'Rank', align: 'right', cell: (row) => <EffortRank row={row} /> },
        ]}
      />
      <p className="mt-2 text-xs text-ink-3">
        Rank among every effort on that climb, from all your rides. &quot;At&quot; is the time into this ride. Shaded on
        the elevation chart.
      </p>
    </Card>
  );
};

const EffortRank = ({ row: { climb, effort } }: { row: ClimbEffortRow }) => {
  if (climb.efforts === 1) return <span className="text-xs text-ink-3">First time</span>;

  const isBest = effort.rank === 1;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${MEDAL_BG[effort.rank - 1] ?? ''} ${isBest ? 'font-semibold' : ''}`}
    >
      {ordinal(effort.rank)} of {climb.efforts}
    </span>
  );
};
