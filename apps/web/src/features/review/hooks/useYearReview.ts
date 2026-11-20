import { monthlyRidingS, yearTotals } from '@app/metrics';
import { useMemo } from 'react';
import { useActivities } from '@/shared/api/activities';
import { useClimbs } from '@/shared/api/climbs';
import { useRecords } from '@/shared/api/records';
import { useTrends } from '@/shared/api/trends';
import type { Discipline } from '@/shared/lib/discipline';
import { ACTIVITY_LIMIT } from '../constants';
import { isYearInProgress } from '../lib/yearTotals';

/** One year's totals, monthly hours and records for rides or runs, with the year before for comparison. */
export const useYearReview = (year: number, today: string, discipline: Discipline) => {
  const records = useRecords(year, discipline);
  const activities = useActivities({
    sport: 'all',
    from: `${year - 1}-01-01`,
    to: `${year}-12-31`,
    limit: ACTIVITY_LIMIT,
  });
  const trends = useTrends();
  const climbs = useClimbs();

  const items = useMemo(() => activities.data?.items ?? [], [activities.data]);
  // A year in progress is compared with the same part of the year before.
  const untilMonthDay = isYearInProgress(year, today) ? today.slice(5) : undefined;

  const totals = useMemo(() => yearTotals(items, year, { discipline }), [items, year, discipline]);
  const previousTotals = useMemo(
    () => yearTotals(items, year - 1, { discipline, untilMonthDay }),
    [items, year, discipline, untilMonthDay],
  );
  // The activity mix splits rides into indoor and outdoor, whichever sport is reviewed.
  const mixTotals = useMemo(() => yearTotals(items, year), [items, year]);
  const months = useMemo(() => monthlyRidingS(items, year, discipline), [items, year, discipline]);
  const previousMonths = useMemo(() => monthlyRidingS(items, year - 1, discipline), [items, year, discipline]);

  // The yearly heart-rate peak and the climbs are cycling's, so a year of runs leaves them out.
  const isCycling = discipline === 'cycling';
  const yearMaxHr = trends.data?.maxHr.find((entry) => entry.year === year) ?? null;
  const maxHr = isCycling ? yearMaxHr : null;
  const newClimbs = useMemo(() => {
    if (!isCycling) return [];
    return (climbs.data?.climbs ?? []).filter((climb) => climb.firstDate.startsWith(`${year}-`));
  }, [climbs.data, year, isCycling]);

  return {
    scope: records.data?.scope ?? null,
    totals,
    previousTotals,
    mixTotals,
    months,
    previousMonths,
    maxHr,
    newClimbs,
    isPending: activities.isPending || records.isPending,
    error: activities.error ?? records.error,
  };
};
