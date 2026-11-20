import { zoneBounds, type Zone } from '@app/metrics';
import type { Activity } from '@/shared/api/client';

export type ZoneSet = NonNullable<Activity['zones']['power']>;

export type ZoneRow = {
  number: number;
  name: string;
  /** "150–180" or "250+", without the unit. */
  range: string;
  seconds: number;
  /** Share of the counted time, 0–100. */
  percent: number;
  /** Bar length, 0–100, relative to the zone with the most time. */
  barPercent: number;
};

/** Each zone's range and time for one ride. */
export const zoneRows = (set: ZoneSet, zones: readonly Zone[]): ZoneRow[] => {
  const total = totalZoneSeconds(set);
  const longest = Math.max(...set.seconds, 1);
  const bounds = zoneBounds(set.threshold, zones);

  return zones.map((zone, i) => {
    const seconds = set.seconds[i] ?? 0;
    const bound = bounds[i]!;
    const range = bound.max === null ? `${bound.min}+` : `${bound.min}–${bound.max}`;
    return {
      number: i + 1,
      name: zone.name,
      range,
      seconds,
      percent: total > 0 ? (seconds / total) * 100 : 0,
      barPercent: (seconds / longest) * 100,
    };
  });
};

/** Riding time counted in the zones. */
export const totalZoneSeconds = (set: ZoneSet): number => {
  let total = 0;
  for (const seconds of set.seconds) total += seconds;
  return total;
};
