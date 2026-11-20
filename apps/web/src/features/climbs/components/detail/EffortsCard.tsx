import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { ClimbDetail } from '@/shared/api/client';
import { ordinal, vam } from '@/shared/lib/climbs';
import { formatClock, formatDate, formatHeartRate, formatPower, formatSpeed, formatVam } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui/DataTable';
import { MEDAL_BG } from '@/shared/ui/medals';
import { Toggle } from '@/shared/ui/Toggle';
import { sortedEfforts, type EffortOrder } from '../../lib/efforts';

const ORDER_OPTIONS: ReadonlyArray<{ value: EffortOrder; label: string }> = [
  { value: 'fastest', label: 'Fastest' },
  { value: 'recent', label: 'Recent' },
];

type EffortsCardProps = {
  climb: ClimbDetail;
};

/** Every effort on the climb, fastest or most recent first. */
export const EffortsCard = ({ climb }: EffortsCardProps) => {
  const [order, setOrder] = useState<EffortOrder>('fastest');
  const rows = sortedEfforts(climb.efforts, order);
  const hasPower = climb.efforts.some((effort) => effort.avgPower !== null);

  return (
    <Card
      title="Efforts"
      action={<Toggle label="Effort order" value={order} onChange={setOrder} options={ORDER_OPTIONS} />}
    >
      <DataTable
        rows={rows}
        rowKey={(effort) => `${effort.activityId}-${effort.startS}`}
        columns={[
          {
            key: 'rank',
            header: 'Rank',
            cell: (effort) => (
              <span
                className={`inline-block min-w-10 rounded-full px-2 py-0.5 text-center text-xs tabular-nums ${MEDAL_BG[effort.rank - 1] ?? ''} ${effort.rank === 1 ? 'font-semibold' : ''}`}
              >
                {ordinal(effort.rank)}
              </span>
            ),
          },
          {
            key: 'ride',
            header: 'Ride',
            cell: (effort) => (
              <>
                <Link
                  to="/activities/$activityId"
                  params={{ activityId: effort.activityId }}
                  className="hover:underline"
                >
                  {formatDate(effort.date)}
                </Link>
                <span className="ml-2 text-xs text-ink-3">{effort.name}</span>
              </>
            ),
          },
          {
            key: 'time',
            header: 'Time',
            align: 'right',
            className: 'font-medium',
            cell: (effort) => formatClock(effort.timeS),
          },
          {
            key: 'speed',
            header: 'Speed',
            align: 'right',
            cell: (effort) => formatSpeed(climb.lengthM / effort.timeS),
          },
          {
            key: 'vam',
            header: 'VAM',
            align: 'right',
            cell: (effort) => formatVam(vam(climb.gainM, effort.timeS)),
          },
          {
            key: 'power',
            header: 'Avg power',
            align: 'right',
            hidden: !hasPower,
            cell: (effort) => formatPower(effort.avgPower),
          },
          { key: 'hr', header: 'Avg HR', align: 'right', cell: (effort) => formatHeartRate(effort.avgHr) },
        ]}
      />
      <p className="mt-2 text-xs text-ink-3">
        Elapsed time from the climb&apos;s start point to its top, stops included. VAM: metres climbed per hour.
      </p>
    </Card>
  );
};
