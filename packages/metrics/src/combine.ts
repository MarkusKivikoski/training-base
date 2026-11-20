import { MEAN_MAX_DURATIONS_S } from './power.js';

export interface RideMeanMax {
  id: string;
  date: string;
  name?: string;
  /** One entry per MEAN_MAX_DURATIONS_S value, null where the ride was shorter. */
  meanMaxPower: readonly (number | null)[] | null;
}

export interface CurvePoint {
  durationS: number;
  watts: number;
  activityId: string;
  date: string;
  name?: string;
}

/**
 * Element-wise maximum of mean-max curves (season / all-time curve). Each point keeps
 * the ride it came from. Durations no ride reached are omitted. Ties keep the earlier ride.
 */
export function combineMeanMax(
  rides: readonly RideMeanMax[],
  durations: readonly number[] = MEAN_MAX_DURATIONS_S,
): CurvePoint[] {
  const best: (CurvePoint | null)[] = durations.map(() => null);
  const ordered = [...rides].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const ride of ordered) {
    if (!ride.meanMaxPower) continue;
    durations.forEach((d, i) => {
      const w = ride.meanMaxPower![i];
      if (typeof w !== 'number') return;
      const cur = best[i] ?? null;
      if (cur === null || w > cur.watts) {
        best[i] = {
          durationS: d,
          watts: w,
          activityId: ride.id,
          date: ride.date,
          ...(ride.name !== undefined ? { name: ride.name } : {}),
        };
      }
    });
  }
  return best.filter((p): p is CurvePoint => p !== null);
}
