import { detectIntervals, type TimeRange } from '@app/metrics';
import type { Activity, ActivityStreams, RideClimb } from '@/shared/api/client';

/** The FTP that work intervals are measured against: the one behind this ride's zones, else its TSS. */
export const intervalFtp = (activity: Activity): number | null =>
  activity.zones.power?.threshold ?? activity.metrics?.ftpUsed ?? null;

/** Work intervals detected from the power stream; none without power or an FTP. */
export const workIntervals = (stream: ActivityStreams, ftp: number | null): TimeRange[] => {
  if (!stream.power || !ftp) return [];
  return detectIntervals(stream.time, stream.power, ftp);
};

/** Each climb effort on this ride as a time range, for shading the elevation chart. */
export const climbRanges = (rideClimbs: readonly RideClimb[]): TimeRange[] => {
  const ranges: TimeRange[] = [];
  for (const { efforts } of rideClimbs) {
    for (const effort of efforts) ranges.push({ startS: effort.startS, endS: effort.startS + effort.timeS });
  }
  return ranges;
};

/** Whether the stream has any real power reading. */
export const hasPowerData = (stream: ActivityStreams): boolean =>
  Boolean(stream.power?.some((watts) => watts !== null && watts > 0));

/** "92%" of FTP, or null without both values. */
export const percentOfFtp = (watts: number | null, ftp: number | null): string | null => {
  if (!watts || !ftp) return null;
  return `${Math.round((watts / ftp) * 100)}%`;
};
