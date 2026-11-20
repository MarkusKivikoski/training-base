import type { ClimbDetail } from '@/shared/api/client';
import { formatClock, formatDate, formatElevation, formatGrade, formatSpeed } from '@/shared/lib/formatters';
import { StatTile } from '@/shared/ui/StatTile';
import { climbLengthText } from '../../lib/climbList';

type ClimbStatsProps = {
  climb: ClimbDetail;
};

/** Length, average grade, gain and best time as tiles. */
export const ClimbStats = ({ climb }: ClimbStatsProps) => {
  const best = climb.efforts.find((effort) => effort.rank === 1)!;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatTile
        label="Length"
        value={climbLengthText(climb.lengthM)}
        hint={`Climb score ${climb.score.toLocaleString('en-GB')}`}
      />
      <StatTile
        label="Average grade"
        value={formatGrade(climb.avgGrade)}
        hint={`Steepest 100 m: ${formatGrade(climb.maxGrade)}`}
      />
      <StatTile label="Elevation gain" value={formatElevation(climb.gainM)} />
      <StatTile
        label="Best time"
        value={formatClock(best.timeS)}
        hint={`${formatDate(best.date)} · ${formatSpeed(climb.lengthM / best.timeS)}`}
      />
    </div>
  );
};
