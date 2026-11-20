import type { ReactNode } from 'react';
import { EMPTY } from '@/shared/lib/formatters';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Numbers align right (and get tabular figures); text aligns left. */
  align?: 'left' | 'right' | undefined;
  /** The cell's content. null, undefined or '' render as a muted dash. */
  cell: (row: T, index: number) => ReactNode;
  /** Extra classes for this column's body cells (e.g. "font-medium", "text-ink-2", "pl-4"). */
  className?: string | ((row: T) => string) | undefined;
  /** Extra classes for the header cell. */
  headerClassName?: string | undefined;
  /** Hover text on the header. */
  title?: string | undefined;
  /** Leave the column out (for columns that only apply sometimes). */
  hidden?: boolean | undefined;
  /** Current sort direction, for aria-sort. */
  sort?: 'ascending' | 'descending' | undefined;
}

const DENSITY = { compact: 'py-1', normal: 'py-1.5', comfortable: 'py-2' } as const;

type DataTableProps<T> = {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T, index: number) => string | number;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Tailwind max-height class (e.g. "max-h-80"): scrolls vertically with a sticky header. */
  maxHeight?: string;
  density?: keyof typeof DENSITY;
  /** Text size: "xs" for tables inside small cards. */
  size?: 'sm' | 'xs';
  showHeader?: boolean;
  rowClassName?: (row: T) => string;
  /** Extra classes on the <table> (e.g. responsive visibility). */
  className?: string;
  wrapperClassName?: string;
  /** Screen-reader caption. */
  caption?: string;
};

const isEmptyCell = (value: ReactNode) => value === null || value === undefined || value === '';

/**
 * The app's table: a header row of small secondary labels, rows separated by hairlines (zebra
 * striping and edge padding come from styles.css), numbers right-aligned in tabular figures and
 * empty cells as a dash. Scrolls sideways when too wide; with `maxHeight` it also scrolls
 * vertically with a sticky header.
 */
export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  empty,
  maxHeight,
  density = 'normal',
  size = 'sm',
  showHeader = true,
  rowClassName,
  className = '',
  wrapperClassName = '',
  caption,
}: DataTableProps<T>) => {
  if (rows.length === 0 && empty !== undefined) return <>{empty}</>;

  const visibleColumns = columns.filter((column) => !column.hidden);
  const padding = DENSITY[density];
  const alignClass = (column: Column<T>) => (column.align === 'right' ? 'text-right' : '');
  const scrollClass = maxHeight ? `${maxHeight} overflow-auto` : 'overflow-x-auto';

  return (
    <div className={`${scrollClass} ${wrapperClassName}`}>
      <table className={`w-full ${size === 'xs' ? 'text-xs' : 'text-sm'} ${className}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {showHeader && (
          <thead className={`text-left text-xs text-ink-2 ${maxHeight ? 'sticky top-0 bg-surface-1' : ''}`}>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  title={column.title}
                  aria-sort={column.sort}
                  className={`${padding} font-medium ${alignClass(column)} ${column.headerClassName ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className={`border-t border-line ${rowClassName?.(row) ?? ''}`}>
              {visibleColumns.map((column) => {
                const value = column.cell(row, i);
                const extraClass =
                  typeof column.className === 'function' ? column.className(row) : (column.className ?? '');
                const numberClass = column.align === 'right' ? 'tabular-nums' : '';
                return (
                  <td key={column.key} className={`${padding} ${alignClass(column)} ${numberClass} ${extraClass}`}>
                    {isEmptyCell(value) ? <span className="text-ink-3">{EMPTY}</span> : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
