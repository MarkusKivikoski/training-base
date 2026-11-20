import { LOAD_CATEGORIES, type WeekCategoryLoad } from '@app/metrics';
import { DataTable, type Column } from '@/shared/ui/DataTable';
import { formatDate, formatTss } from '@/shared/lib/formatters';
import { LOAD_CATEGORY_LOOK, weekTotal } from '../../lib/allActivitiesLoad';

type CategoryLoadTableProps = {
  weeks: readonly WeekCategoryLoad[];
};

const categoryColumns: Column<WeekCategoryLoad>[] = LOAD_CATEGORIES.map((category) => ({
  key: category,
  header: LOAD_CATEGORY_LOOK[category].label,
  align: 'right',
  cell: (week) => (week[category] ? formatTss(week[category]) : null),
}));

/** Weekly TSS per activity group, newest week first. */
export const CategoryLoadTable = ({ weeks }: CategoryLoadTableProps) => (
  <DataTable
    rows={[...weeks].reverse()}
    rowKey={(week) => week.weekStart}
    columns={[
      { key: 'week', header: 'Week of', cell: (week) => formatDate(week.weekStart) },
      ...categoryColumns,
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        className: 'font-medium',
        cell: (week) => formatTss(weekTotal(week)),
      },
    ]}
  />
);
