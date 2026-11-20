import { formatDistance, formatElevation, formatHours } from '@/shared/lib/formatters';
import { DataTable } from '@/shared/ui/DataTable';
import type { Granularity, VolumeBucket } from '../../lib/volumeBuckets';

type VolumeTableProps = {
  buckets: readonly VolumeBucket[];
  granularity: Granularity;
  /** Opens a month (`YYYY-MM`) in the calendar. */
  onMonthOpen: (month: string) => void;
};

/** Every measure per period, newest first: the table view of the volume chart. */
export const VolumeTable = ({ buckets, granularity, onMonthOpen }: VolumeTableProps) => {
  const isMonthly = granularity === 'month';

  const periodCell = (bucket: VolumeBucket) => {
    if (!isMonthly) return bucket.label;
    return (
      <button
        type="button"
        onClick={() => onMonthOpen(bucket.key)}
        className="text-ink hover:underline"
        title="Open in calendar"
      >
        {bucket.label}
      </button>
    );
  };

  return (
    <DataTable
      maxHeight="max-h-96"
      rows={[...buckets].reverse()}
      rowKey={(bucket) => bucket.key}
      columns={[
        { key: 'period', header: isMonthly ? 'Month' : 'Year', cell: periodCell },
        { key: 'indoor', header: 'Indoor', align: 'right', cell: (bucket) => formatHours(bucket.indoorS) },
        { key: 'outdoor', header: 'Outdoor', align: 'right', cell: (bucket) => formatHours(bucket.outdoorS) },
        { key: 'rides', header: 'Rides', align: 'right', cell: (bucket) => bucket.rides },
        {
          key: 'distance',
          header: 'Distance',
          align: 'right',
          cell: (bucket) => formatDistance(bucket.distanceM, 0),
        },
        {
          key: 'elevation',
          header: 'Elevation',
          align: 'right',
          cell: (bucket) => formatElevation(bucket.elevationGainM),
        },
        { key: 'strength', header: 'Strength', align: 'right', cell: (bucket) => bucket.strengthSessions },
      ]}
    />
  );
};
