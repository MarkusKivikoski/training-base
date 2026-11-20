import { useMemo } from 'react';
import type { Activity, ActivityStreams } from '@/shared/api/client';
import { useActivityStreams } from '@/shared/api/activities';
import { formatDate } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { Loading } from '@/shared/ui/Loading';
import { CompareCharts } from './charts/CompareCharts';

type OverlaidCardProps = {
  a: Activity;
  b: Activity;
};

/** Both rides' per-second data overlaid on shared charts. */
export const OverlaidCard = ({ a, b }: OverlaidCardProps) => {
  const streamA = useActivityStreams(a.id);
  const streamB = useActivityStreams(b.id);
  const labels = useMemo(() => [`A: ${formatDate(a.date)}`, `B: ${formatDate(b.date)}`] as const, [a.date, b.date]);

  return (
    <Card title="Overlaid">
      <OverlaidBody
        a={streamA.data}
        b={streamB.data}
        isPending={streamA.isPending || streamB.isPending}
        labels={labels}
      />
    </Card>
  );
};

type OverlaidBodyProps = {
  a: ActivityStreams | undefined;
  b: ActivityStreams | undefined;
  isPending: boolean;
  labels: readonly [string, string];
};

const OverlaidBody = ({ a, b, isPending, labels }: OverlaidBodyProps) => {
  if (a && b) return <CompareCharts a={a} b={b} labels={labels} />;
  if (isPending) return <Loading />;
  return <p className="text-sm text-ink-3">Per-second data is missing for one of the rides.</p>;
};
