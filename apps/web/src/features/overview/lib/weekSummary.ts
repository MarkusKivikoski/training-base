import type { WeekVolume } from '@app/metrics';

export interface WeekSummary {
  /** Riding time in the current week, seconds. */
  thisWeekS: number;
  thisWeekRides: number;
  thisWeekDistanceM: number;
  /** Average riding time of the 4 weeks before this one, seconds. */
  previousFourAverageS: number;
}

const ridingTimeS = (week: WeekVolume) => week.indoorDurationS + week.outdoorDurationS;

/** This week's riding and the average of the four weeks before it, from weekly totals (oldest first). */
export const summariseWeeks = (weeks: readonly WeekVolume[]): WeekSummary => {
  const thisWeek = weeks.at(-1);
  const previousFour = weeks.slice(-5, -1);

  let previousTotalS = 0;
  for (const week of previousFour) previousTotalS += ridingTimeS(week);

  return {
    thisWeekS: thisWeek ? ridingTimeS(thisWeek) : 0,
    thisWeekRides: thisWeek?.count ?? 0,
    thisWeekDistanceM: thisWeek?.distanceM ?? 0,
    previousFourAverageS: previousFour.length > 0 ? previousTotalS / previousFour.length : 0,
  };
};
