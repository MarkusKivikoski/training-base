import type { Activity } from '@/shared/api/client';
import {
  formatCadence,
  formatCalories,
  formatClock,
  formatDistance,
  formatElevation,
  formatHeartRate,
  formatSpeed,
} from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { decouplingMissingReason } from '../../lib/decouplingNote';
import { DecouplingStat } from './DecouplingStat';
import { Stat } from './Stat';

type SummaryCardProps = {
  activity: Activity;
};

/** Time, distance, speed, elevation, heart rate, calories and (for rides) cadence and aerobic decoupling. */
export const SummaryCard = ({ activity }: SummaryCardProps) => {
  const missingReason = decouplingMissingReason(activity);
  const showsDecoupling = activity.decoupling !== null || missingReason !== null;

  return (
    <Card title="Summary" className="lg:col-span-2">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Stat label="Duration" value={formatClock(activity.durationS)} />
        <Stat label="Moving time" value={formatClock(activity.movingDurationS)} />
        <Stat label="Distance" value={formatDistance(activity.distanceM, 2)} />
        <Stat label="Avg speed" value={formatSpeed(activity.avgSpeedMps)} />
        <Stat label="Max speed" value={formatSpeed(activity.maxSpeedMps)} />
        <Stat label="Elevation gain" value={activity.isIndoor ? '—' : formatElevation(activity.elevationGainM)} />
        <Stat label="Avg heart rate" value={formatHeartRate(activity.avgHr)} />
        <Stat label="Max heart rate" value={formatHeartRate(activity.maxHr)} />
        <Stat label="Active calories" value={formatCalories(activity.activeCalories)} />
        {activity.isCycling && <Stat label="Avg cadence" value={formatCadence(activity.avgCadence)} />}
        {activity.isCycling && <Stat label="Max cadence" value={formatCadence(activity.maxCadence)} />}
        {showsDecoupling && <DecouplingStat decoupling={activity.decoupling} missingReason={missingReason} />}
      </dl>
    </Card>
  );
};
