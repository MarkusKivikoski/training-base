import { useMemo } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { formatClock } from '@/shared/lib/formatters';
import { DataTable, type Column } from '@/shared/ui/DataTable';
import { minuteAverages, type MinuteRow } from '@/shared/lib/minuteAverages';
import type { RidePanel } from './ridePanels';

type MinuteTableProps = {
  stream: ActivityStreams;
  panels: readonly RidePanel[];
};

/** One-minute averages, the accessible alternative to the charts. */
export const MinuteTable = ({ stream, panels }: MinuteTableProps) => {
  const rows = useMemo(() => minuteAverages(stream.time, panels, (key) => stream[key]), [stream, panels]);

  const channelColumns = panels.map((panel, k): Column<MinuteRow> => ({
    key: panel.key,
    header: `${panel.title} (${panel.unit})`,
    align: 'right',
    cell: (row) => row.averages[k]?.toFixed(panel.digits) ?? null,
  }));

  return (
    <DataTable
      maxHeight="max-h-96"
      density="compact"
      rows={rows}
      rowKey={(row) => row.minute}
      columns={[{ key: 'minute', header: 'Minute', cell: (row) => formatClock(row.minute * 60) }, ...channelColumns]}
    />
  );
};
