import { DataTable } from '@/shared/ui/DataTable';
import { formatDate, formatLoad, formatTss } from '@/shared/lib/formatters';
import type { FitnessRow } from '../../lib/fitnessRows';
import { describeDayZones } from '../../lib/zoneText';

type FitnessTableProps = {
  rows: readonly FitnessRow[];
};

/** The fitness chart's values as a table, newest day first; forecast days are marked. */
export const FitnessTable = ({ rows }: FitnessTableProps) => (
  <DataTable
    maxHeight="max-h-80"
    rows={[...rows].reverse()}
    rowKey={(row) => row.date}
    columns={[
      {
        key: 'date',
        header: 'Date',
        cell: (row) => (row.isPlanned ? `${formatDate(row.date)} · forecast` : formatDate(row.date)),
      },
      { key: 'tss', header: 'TSS', align: 'right', cell: (row) => (row.tss ? formatTss(row.tss) : null) },
      { key: 'ctl', header: 'Fitness', align: 'right', cell: (row) => formatLoad(row.ctl) },
      { key: 'atl', header: 'Fatigue', align: 'right', cell: (row) => formatLoad(row.atl) },
      { key: 'tsb', header: 'Form', align: 'right', cell: (row) => formatLoad(row.tsb, true) },
      {
        key: 'zones',
        header: 'Zones',
        headerClassName: 'pl-3',
        className: 'pl-3 text-xs text-ink-2',
        cell: (row) => describeDayZones(row.status),
      },
    ]}
  />
);
