import type { Zone } from '@app/metrics';
import { formatDate, formatHours, formatMonth } from '@/shared/lib/formatters';
import { DataTable, type Column } from '@/shared/ui/DataTable';
import { totalSeconds } from '../../lib/zoneTime';
import type { ZoneChannel, ZonePeriod, ZonePeriodRow } from './zoneTrendTypes';

type ZoneTrendTableProps = {
  rows: readonly ZonePeriodRow[];
  zones: readonly Zone[];
  channel: ZoneChannel;
  period: ZonePeriod;
};

/** Hours per zone and period, newest first: the table view of the zones chart. */
export const ZoneTrendTable = ({ rows, zones, channel, period }: ZoneTrendTableProps) => {
  const zoneColumns = zones.map((zone, i): Column<ZonePeriodRow> => ({
    key: zone.name,
    header: `Z${i + 1}`,
    title: zone.name,
    align: 'right',
    cell: (row) => {
      const seconds = row[channel][i] ?? 0;
      return seconds > 0 ? formatHours(seconds) : null;
    },
  }));

  return (
    <DataTable
      maxHeight="max-h-80"
      rows={[...rows].reverse()}
      rowKey={(row) => row.period}
      columns={[
        {
          key: 'period',
          header: period === 'week' ? 'Week of' : 'Month',
          cell: (row) => (period === 'week' ? formatDate(row.period) : formatMonth(row.period)),
        },
        ...zoneColumns,
        {
          key: 'total',
          header: 'Total',
          align: 'right',
          className: 'font-medium',
          cell: (row) => formatHours(totalSeconds(row[channel])),
        },
      ]}
    />
  );
};
