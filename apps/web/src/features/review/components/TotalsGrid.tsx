import type { YearTotals } from '@app/metrics';
import type { Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { totalTiles } from '../lib/yearTotals';

type TotalsGridProps = {
  totals: YearTotals;
  previousTotals: YearTotals;
  previousYear: number;
  /** What the year is compared with, e.g. "2025 by 9.11.". */
  comparison: string;
  discipline: Discipline;
};

/** Rides (or runs), their time, distance and climbing, gym workouts and active days, each with its change. */
export const TotalsGrid = ({ totals, previousTotals, previousYear, comparison, discipline }: TotalsGridProps) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
    {totalTiles(totals, previousTotals, previousYear, discipline).map((tile) => (
      <Card key={tile.label}>
        <p className="text-xs font-medium text-ink-2">{tile.label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-ink">{tile.value}</p>
        <p className="mt-1 text-xs text-ink-3">{tile.change ?? `none in ${comparison}`}</p>
      </Card>
    ))}
  </div>
);
