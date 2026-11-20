import { StatTile } from '@/shared/ui/StatTile';
import { formatDistance, formatHours, formatTimestamp } from '@/shared/lib/formatters';
import type { WeekSummary } from '../../lib/weekSummary';
import { FtpTile } from './FtpTile';

type SummaryTilesProps = {
  week: WeekSummary;
  ftp: { watts: number; from: string } | null;
  weightKg: number | null;
  estimatedFtp: number | null;
  activityCount: number;
  /** When the activity index was last built (ISO timestamp). */
  indexBuiltAt: string | null;
};

/** The four headline tiles: this week, the previous four weeks, FTP and the synced activities. */
export const SummaryTiles = ({ week, ftp, weightKg, estimatedFtp, activityCount, indexBuiltAt }: SummaryTilesProps) => {
  const ridesText = `${week.thisWeekRides} rides`;
  // An all-indoor week has no distance to show (indoor distance isn't counted).
  const hasOutdoorDistance = week.thisWeekDistanceM > 0;
  const thisWeekHint = hasOutdoorDistance
    ? `${ridesText} · ${formatDistance(week.thisWeekDistanceM, 0)} outdoors`
    : ridesText;

  return (
    <>
      <StatTile label="This week" value={formatHours(week.thisWeekS)} hint={thisWeekHint} />
      <StatTile
        label="Previous 4 weeks"
        value={`${formatHours(week.previousFourAverageS)} / week`}
        hint="Average riding time"
      />
      <FtpTile ftp={ftp} weightKg={weightKg} estimatedFtp={estimatedFtp} />
      <StatTile
        label="Activities synced"
        value={activityCount}
        hint={indexBuiltAt ? `Index built ${formatTimestamp(indexBuiltAt)}` : undefined}
      />
    </>
  );
};
