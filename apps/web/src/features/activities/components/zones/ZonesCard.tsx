import { HR_ZONES, POWER_ZONES } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { ZonePanel } from './ZonePanel';

type ZonesCardProps = {
  activity: Activity;
};

/**
 * Time in power and heart-rate zones for one ride. Each zone is a text row with its range,
 * a bar for its share of time, the time and the percentage, so it reads without hover or
 * colour. Bars use the zone ramps from styles.css (power blue, HR orange), darker for harder zones.
 */
export const ZonesCard = ({ activity }: ZonesCardProps) => {
  const { power, hr } = activity.zones;
  if (!power && !hr) return null;

  return (
    <Card title="Time in zones" className="lg:col-span-3">
      <div className="grid gap-6 md:grid-cols-2">
        {power && (
          <ZonePanel title="Power" set={power} zones={POWER_ZONES} unit="W" thresholdName="FTP" channel="power" />
        )}
        {hr && <ZonePanel title="Heart rate" set={hr} zones={HR_ZONES} unit="bpm" thresholdName="LTHR" channel="hr" />}
      </div>
    </Card>
  );
};
