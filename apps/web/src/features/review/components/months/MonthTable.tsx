import { formatHours, formatMonth } from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import { MONTH_LABELS } from '../../constants';

type MonthTableProps = {
  year: number;
  months: readonly number[];
  previousMonths: readonly number[];
  bestIndex: number;
};

const hoursOrEmpty = (seconds: number | undefined) => (seconds ? formatHours(seconds) : null);

/** Riding hours per month for this year and the year before. */
export const MonthTable = ({ year, months, previousMonths, bestIndex }: MonthTableProps) => (
  <DataTable
    rows={MONTH_LABELS.map((label, index) => ({ label, index }))}
    rowKey={(row) => row.label}
    columns={[
      {
        key: 'month',
        header: 'Month',
        cell: (row) => formatMonth(`${year}-${String(row.index + 1).padStart(2, '0')}`),
      },
      {
        key: 'now',
        header: String(year),
        align: 'right',
        className: (row) => (row.index === bestIndex ? 'font-semibold' : ''),
        cell: (row) => hoursOrEmpty(months[row.index]),
      },
      {
        key: 'prev',
        header: String(year - 1),
        align: 'right',
        className: 'text-ink-2',
        cell: (row) => hoursOrEmpty(previousMonths[row.index]),
      },
    ]}
  />
);
