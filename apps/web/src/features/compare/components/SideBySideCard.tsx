import type { Activity } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui/DataTable';
import { formattedDifference, formattedValue, visibleRows } from '../lib/compareRows';
import { RideColumnHeader } from './RideColumnHeader';

type SideBySideCardProps = {
  a: Activity;
  b: Activity;
};

/** The two rides' totals and averages next to each other, with the difference B − A. */
export const SideBySideCard = ({ a, b }: SideBySideCardProps) => (
  <Card title="Side by side">
    <DataTable
      rows={visibleRows(a, b)}
      rowKey={(row) => row.label}
      columns={[
        { key: 'label', header: '', className: 'text-ink-2', cell: (row) => row.label },
        {
          key: 'a',
          header: <RideColumnHeader slot="a" ride={a} />,
          align: 'right',
          cell: (row) => formattedValue(row, a),
        },
        {
          key: 'b',
          header: <RideColumnHeader slot="b" ride={b} />,
          align: 'right',
          cell: (row) => formattedValue(row, b),
        },
        {
          key: 'diff',
          header: 'B − A',
          align: 'right',
          className: 'text-ink-2',
          cell: (row) => formattedDifference(row, a, b),
        },
      ]}
    />
  </Card>
);
