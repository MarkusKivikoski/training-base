/** A training zone: its name and lower bound as a fraction of the threshold (FTP or LTHR). */
export interface Zone {
  name: string;
  lower: number;
}

/** Coggan power zones as fractions of FTP. */
export const POWER_ZONES: readonly Zone[] = [
  { name: 'Active recovery', lower: 0 },
  { name: 'Endurance', lower: 0.56 },
  { name: 'Tempo', lower: 0.76 },
  { name: 'Threshold', lower: 0.91 },
  { name: 'VO₂ max', lower: 1.06 },
  { name: 'Anaerobic', lower: 1.21 },
  { name: 'Neuromuscular', lower: 1.51 },
];

/** Coggan heart-rate zones as fractions of LTHR. */
export const HR_ZONES: readonly Zone[] = [
  { name: 'Recovery', lower: 0 },
  { name: 'Endurance', lower: 0.69 },
  { name: 'Tempo', lower: 0.84 },
  { name: 'Threshold', lower: 0.95 },
  { name: 'VO₂ max', lower: 1.06 },
];

/** Index of the zone `value` falls in: the last zone whose lower bound is at or below it. */
export function zoneIndex(value: number, threshold: number, zones: readonly Zone[]): number {
  let idx = 0;
  for (let i = 1; i < zones.length; i++) {
    // Rounded to avoid float noise right at a boundary (e.g. 0.56 × 200).
    if (value >= Math.round(zones[i]!.lower * threshold * 1e6) / 1e6) idx = i;
  }
  return idx;
}

/**
 * Seconds per zone, from 1 Hz segments (powerSegments / hrSegments, so the usual gap rules
 * apply and pauses are excluded). The total equals the segments' duration.
 */
export function timeInZones(
  segments: readonly (readonly number[])[],
  threshold: number,
  zones: readonly Zone[],
): number[] {
  const seconds = zones.map(() => 0);
  for (const seg of segments) for (const v of seg) seconds[zoneIndex(v, threshold, zones)]!++;
  return seconds;
}

/**
 * Whole-unit range of each zone for labels: zone i covers [min, max] watts or bpm, where max
 * is null for the open top zone. Bounds round up, so a value of `min` belongs to the zone.
 */
export function zoneBounds(threshold: number, zones: readonly Zone[]): Array<{ min: number; max: number | null }> {
  const mins = zones.map((z) => Math.ceil(Math.round(z.lower * threshold * 1e6) / 1e6));
  return mins.map((min, i) => ({ min, max: i + 1 < mins.length ? mins[i + 1]! - 1 : null }));
}

/** Time in the easy zones out of all zoned time, summed over several activities. */
export interface LowZoneShare {
  lowS: number;
  totalS: number;
}

/**
 * How much of the zoned time fell in the lowest `lowZoneCount` zones (Z1–Z2 by default), over
 * the given per-activity seconds-per-zone arrays. Null when there is no zoned time at all.
 */
export function lowZoneShare(
  perActivitySeconds: ReadonlyArray<readonly number[]>,
  lowZoneCount = 2,
): LowZoneShare | null {
  let lowS = 0;
  let totalS = 0;
  for (const seconds of perActivitySeconds) {
    seconds.forEach((zoneSeconds, zone) => {
      totalS += zoneSeconds;
      if (zone < lowZoneCount) lowS += zoneSeconds;
    });
  }
  if (totalS === 0) return null;
  return { lowS, totalS };
}
