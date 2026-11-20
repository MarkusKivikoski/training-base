import type { LoadZone } from '@app/metrics';
import { zoneRangeInWords } from '../../lib/zoneText';
import { StatusChip } from '../StatusChip';

type ZoneListProps = {
  title: string;
  zones: readonly LoadZone[];
  format: (value: number) => string;
};

/** A measure's zones with their ranges, e.g. "✓ Optimal · 0.8× to 1.3×". */
export const ZoneList = ({ title, zones, format }: ZoneListProps) => (
  <div>
    <dt className="mb-1 font-medium text-ink">{title}</dt>
    {zones.map((zone) => (
      <dd key={zone.label}>
        <StatusChip
          status={{ baseline: false, zone, value: 0 }}
          baselineUntil={null}
          detail={zoneRangeInWords(zone, format)}
        />
      </dd>
    ))}
  </div>
);
