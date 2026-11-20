import { ACTIVITY_SCHEMA_VERSION, rawActivitySummarySchema, type ActivitySummary } from '@app/shared';

/** Garmin's sportTypeId for cycling, seen on cycling, gravel_cycling and indoor_cycling. */
const CYCLING_SPORT_TYPE_ID = 2;

/** Garmin's sportTypeId for running: seen on all 18 runs in the cache (typeKey "running"), 2026-11-11. */
const RUNNING_SPORT_TYPE_ID = 1;

/** typeKeys that are indoor by definition, even if a device reports a position. */
const INDOOR_TYPE_KEYS = new Set([
  'indoor_cycling',
  'virtual_ride',
  'treadmill_running',
  'indoor_running',
  'indoor_rowing',
  'indoor_cardio',
  'lap_swimming',
]);

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Maps a stored Garmin summary (data/raw/<id>.json) to our activity summary.
 * Garmin's own derived metrics (normPower, TSS, IF, training effect) are deliberately
 * ignored: we compute our own from the FIT file in a later step.
 */
export function summaryFromRaw(raw: unknown): ActivitySummary {
  const parsed = rawActivitySummarySchema.safeParse(raw);
  if (!parsed.success) {
    const where = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Raw summary has an unexpected shape (${where})`);
  }
  const r = parsed.data;
  const typeKey = r.activityType.typeKey;
  const isCycling = r.sportTypeId === CYCLING_SPORT_TYPE_ID;
  const hasGps = num(r.startLatitude) !== null;
  const avgPower = num(r.avgPower);

  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id: String(r.activityId),
    name: r.activityName?.trim() || typeKey.replaceAll('_', ' '),
    sport: typeKey,
    isCycling,
    isRunning: r.sportTypeId === RUNNING_SPORT_TYPE_ID,
    isIndoor: INDOOR_TYPE_KEYS.has(typeKey) || !hasGps,
    startTimeLocal: r.startTimeLocal.replace(' ', 'T'),
    startTimeUtc: `${r.startTimeGMT.replace(' ', 'T')}.000Z`,
    date: r.startTimeLocal.slice(0, 10),
    durationS: r.duration,
    movingDurationS: num(r.movingDuration),
    distanceM: num(r.distance),
    elevationGainM: num(r.elevationGain),
    avgSpeedMps: num(r.averageSpeed),
    maxSpeedMps: num(r.maxSpeed),
    avgHr: num(r.averageHR),
    maxHr: num(r.maxHR),
    avgCadence: num(r.averageBikingCadenceInRevPerMinute),
    maxCadence: num(r.maxBikingCadenceInRevPerMinute),
    avgPower,
    maxPower: num(r.maxPower),
    activeCalories: activeCalories(num(r.calories), num(r.bmrCalories)),
    hasPower: avgPower !== null && avgPower > 0,
    metrics: null,
    meanMaxPower: null,
    hrLoad: null,
    load: null,
    zones: { power: null, hr: null },
    records: null,
    climbs: null,
    hrPeak5s: null,
    lthrEstimate: null,
    decoupling: null,
    workoutType: null,
    mergedFrom: null,
  };
}

/** Active calories as Garmin Connect shows them: total minus resting (BMR). Null if either is missing. */
export function activeCalories(total: number | null, bmr: number | null): number | null {
  return total === null || bmr === null ? null : Math.max(0, total - bmr);
}
