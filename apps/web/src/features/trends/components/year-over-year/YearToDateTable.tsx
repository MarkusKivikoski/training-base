import type { YearMetric } from '@app/metrics';
import type { Trends } from '@/shared/api/client';
import { DataTable } from '@/shared/ui/DataTable';
import { differenceText } from '../../lib/comparedYears';
import { YEAR_METRIC_INFO } from '../../lib/volumeMetrics';

type Year = Trends['years'][number];

type YearToDateTableProps = {
  years: readonly Year[];
  currentYear: number;
  metric: YearMetric;
};

/** Each year's total by today's date, newest first, with this year's lead or gap. */
export const YearToDateTable = ({ years, currentYear, metric }: YearToDateTableProps) => {
  const info = YEAR_METRIC_INFO[metric];
  const newestFirst = [...years].sort((first, second) => second.year - first.year);
  const thisYearSoFar = years.find((year) => year.year === currentYear)?.toDate[metric] ?? 0;

  return (
    <DataTable
      rows={newestFirst}
      rowKey={(year) => year.year}
      columns={[
        {
          key: 'year',
          header: 'Year',
          className: (year) => (year.year === currentYear ? 'font-semibold' : ''),
          cell: (year) => year.year,
        },
        { key: 'value', header: info.label, align: 'right', cell: (year) => info.short(year.toDate[metric]) },
        {
          key: 'diff',
          header: `${currentYear} vs`,
          align: 'right',
          className: 'text-xs text-ink-3',
          cell: (year) => {
            if (year.year === currentYear) return ' ';
            return differenceText(thisYearSoFar - year.toDate[metric], info.short);
          },
        },
      ]}
    />
  );
};
