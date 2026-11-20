import type { CurvePoint } from '@app/metrics';
import { Link } from '@tanstack/react-router';
import { formatDate, formatDurationLabel, formatPower, formatWattsPerKg } from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import { pointAt, pointWattsPerKg, type KgForDate } from '../../lib/curveValues';

type CurveTableProps = {
  primary: CurvePoint[];
  compare: CurvePoint[];
  compareLabel: string | null;
  kgFor: KgForDate;
};

/** Best power per duration with its ride, and the comparison range's value beside it. */
export const CurveTable = ({ primary, compare, compareLabel, kgFor }: CurveTableProps) => (
  <DataTable
    rows={primary}
    rowKey={(point) => point.durationS}
    columns={[
      { key: 'duration', header: 'Duration', cell: (point) => formatDurationLabel(point.durationS) },
      {
        key: 'power',
        header: 'Power',
        align: 'right',
        className: 'font-semibold',
        cell: (point) => formatPower(point.watts),
      },
      {
        key: 'wkg',
        header: 'W/kg',
        align: 'right',
        cell: (point) => {
          const wattsPerKg = pointWattsPerKg(point, kgFor);
          return wattsPerKg === null ? null : formatWattsPerKg(wattsPerKg);
        },
      },
      {
        key: 'ride',
        header: 'Ride',
        headerClassName: 'pl-4',
        className: 'pl-4',
        cell: (point) => (
          <Link to="/activities/$activityId" params={{ activityId: point.activityId }} className="hover:underline">
            {formatDate(point.date)}
          </Link>
        ),
      },
      {
        key: 'compare',
        header: compareLabel ?? '',
        hidden: !compareLabel,
        align: 'right',
        cell: (point) => {
          const other = pointAt(compare, point.durationS);
          return other ? formatPower(other.watts) : null;
        },
      },
    ]}
  />
);
