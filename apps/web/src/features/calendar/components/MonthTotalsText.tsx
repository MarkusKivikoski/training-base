import type { WeekTotals } from '@app/metrics';
import { monthTotalParts } from '../lib/totalsText';

type MonthTotalsTextProps = {
  totals: WeekTotals;
};

/** Month totals as one line of figures: riding time, outdoor distance and climbing, rides, TSS, other activities. */
export const MonthTotalsText = ({ totals }: MonthTotalsTextProps) => (
  <span className="flex flex-wrap gap-x-5 gap-y-1">
    {monthTotalParts(totals).map((part) => (
      <span key={part.label}>
        <span className="font-semibold tabular-nums text-ink">{part.value}</span>{' '}
        <span className="text-ink-2">{part.label}</span>
      </span>
    ))}
  </span>
);
