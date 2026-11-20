import { combineMeanMax, criticalPower, weightOnDate } from '@app/metrics';
import { useCallback, useMemo } from 'react';
import { useMeanMax } from '@/shared/api/activities';
import { useSettings } from '@/shared/api/settings';
import type { ComparePreset, Preset } from '../constants';
import type { KgForDate } from '../lib/curveValues';
import { rangeFor } from '../lib/ranges';

/** The best-power curves of the chosen range and the comparison range, and the weight lookup for W/kg. */
export const usePowerCurves = (today: string | undefined, primary: Preset, compare: ComparePreset) => {
  const settings = useSettings();
  const primaryQuery = useMeanMax(today ? rangeFor(primary, today) : null);
  const compareQuery = useMeanMax(today && compare !== 'none' ? rangeFor(compare, today) : null);

  const primaryCurve = useMemo(() => combineMeanMax(primaryQuery.data ?? []), [primaryQuery.data]);
  const compareCurve = useMemo(
    () => (compare === 'none' ? [] : combineMeanMax(compareQuery.data ?? [])),
    [compare, compareQuery.data],
  );

  const model = useMemo(() => criticalPower(primaryCurve), [primaryCurve]);

  const weightHistory = useMemo(() => settings.data?.weightHistory ?? [], [settings.data]);
  // Weight on each effort's date (the earliest entry applies before it), so W/kg follows weight changes.
  const kgFor: KgForDate = useCallback((date) => weightOnDate(weightHistory, date), [weightHistory]);

  return {
    primaryCurve,
    compareCurve,
    kgFor,
    hasWeight: weightHistory.length > 0,
    /** Critical power model fitted to the chosen range's 2–20 minute bests, if it fits. */
    model,
    ftp: settings.data?.ftp?.watts ?? null,
    kgToday: today ? weightOnDate(weightHistory, today) : null,
    /** Rides with power in the chosen range, once loaded. */
    rideCount: primaryQuery.data?.length,
    isPending: !today || primaryQuery.isPending,
    error: primaryQuery.error,
  };
};
