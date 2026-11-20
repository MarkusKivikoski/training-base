import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui/DataTable';

/** A label/value pair in the card's value list, oldest first. */
export type MarkerRow = [label: string, value: string];

type MarkerCardProps = {
  title: string;
  latest: string;
  latestHint: ReactNode;
  /** How many values there are; the chart shows from two up. */
  count: number;
  chart: ReactNode;
  notes: ReactNode;
  rows: readonly MarkerRow[];
  className?: string | undefined;
};

/** A fitness-marker card: the latest value, then a chart once there are two points, then notes and a value list. */
export const MarkerCard = ({ title, latest, latestHint, count, chart, notes, rows, className }: MarkerCardProps) => (
  <Card title={title} className={className ?? ''}>
    <p className="text-2xl font-semibold tracking-tight text-ink">{latest}</p>
    <p className="mb-3 text-xs text-ink-3">{latestHint}</p>
    {count >= 2 ? chart : <p className="mb-3 text-xs text-ink-3">A chart appears once there are two or more values.</p>}
    <p className="mt-2 text-xs text-ink-3">{notes}</p>
    {rows.length > 0 && (
      <details className="mt-2 text-xs text-ink-2">
        <summary className="cursor-pointer">Values ({rows.length})</summary>
        <DataTable
          wrapperClassName="mt-1"
          size="xs"
          density="compact"
          showHeader={false}
          rows={[...rows].reverse()}
          rowKey={(_, i) => i}
          columns={[
            { key: 'label', header: 'Date', cell: ([label]) => label },
            { key: 'value', header: 'Value', align: 'right', cell: ([, value]) => value },
          ]}
        />
      </details>
    )}
  </Card>
);
