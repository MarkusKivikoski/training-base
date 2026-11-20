import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  activityTss,
  bestDistanceEfforts,
  cleanDistance,
  streamMovingTime,
  aerobicDecoupling,
  dailyLoad,
  isSteadyPowerRide,
  isSteadySpeedRide,
  estimateLthr,
  maxSustainedSpeed,
  disciplineOf,
  RECORD_INPUTS,
  HR_ZONES,
  POWER_ZONES,
  timeInZones,
  hrSegments,
  hrTss,
  peakHr,
  meanMaxPower,
  normalizedPower,
  powerSegments,
  segmentsDuration,
  intensityFactor,
  trainingStressScore,
  classifyWorkout,
  workIntervalsOf,
} from '@app/metrics';
import {
  createActivityStore,
  createFitStore,
  createHeatmapStore,
  createTrendsStore,
  createRecordsStore,
  createClimbsStore,
  createRepeatsStore,
  createIndexStore,
  createLoadStore,
  createManifestStore,
  createRouteStore,
  createSettingsStore,
  createStreamStore,
  effectiveOn,
  thresholdOn,
  HEATMAP_SCHEMA_VERSION,
  ACTIVITY_SCHEMA_VERSION,
  INDEX_SCHEMA_VERSION,
  MANIFEST_SCHEMA_VERSION,
  STREAM_SCHEMA_VERSION,
  LOAD_SCHEMA_VERSION,
  ROUTE_SCHEMA_VERSION,
  type ActivityId,
  type ActivityRoute,
  type Manifest,
  type ManifestRide,
  type ActivityStream,
  type ActivitySummary,
  type FtpEntry,
  type HeatmapRoute,
  type LthrEntry,
} from '@app/shared';
import { FitNoRecordsError } from '../fit/parseFit.js';
import { routeFromStream, simplifyRoute } from '../fit/simplifyRoute.js';
import { toStreams } from '../fit/toStreams.js';
import { trimRoute } from '../fit/trimRoute.js';
import { localToday } from '../sync/dates.js';
import {
  baseSummaryOf,
  decodeSource,
  hasEveryFit,
  mergesByRecording,
  readRideSource,
  sourceFingerprint,
} from './rideSource.js';
import { buildTrends } from './trends.js';
import { buildRecords } from './records.js';
import { buildClimbs, computeClimbs } from './climbs.js';
import { buildRepeats } from './repeats.js';

export interface RebuildResult {
  /** What actually ran: incremental falls back to full without a usable manifest. */
  mode: 'full' | 'incremental';
  activities: number;
  withStreams: number;
  withMetrics: number;
  withLoad: number;
  loadDays: number;
  heatmapRoutes: number;
  /** Distinct climbs found in outdoor rides. */
  climbs: number;
  /** Indoor workouts ridden more than once. */
  repeatedWorkouts: number;
  /** Outdoor routes ridden more than once. */
  repeatedRoutes: number;
  /** Rides whose FIT file was parsed. */
  parsed: number;
  /** Rides recomputed from stored streams (FTP/LTHR changed) or without a FIT file. */
  recomputed: number;
  /** Rides whose derived files were reused unchanged. */
  reused: number;
  /** Activities whose FIT file holds no records (manual entries): kept from the summary, no streams. */
  withoutRecords: number;
  failed: Array<{ id: string; error: string }>;
}

/** Heart-rate TSS at the LTHR in effect on `date`. Null without heart rate or LTHR (never back-dated). */
export function computeHrLoad(
  stream: ActivityStream,
  date: string,
  lthrHistory: readonly LthrEntry[],
): ActivitySummary['hrLoad'] {
  const lthr = effectiveOn(lthrHistory, date)?.bpm;
  if (!lthr || !stream.hr || !stream.hr.some((v) => v !== null && v > 0)) return null;
  return { tss: Math.round(hrTss(hrSegments(stream.time, stream.hr), lthr) * 10) / 10, lthrUsed: lthr };
}

/** The TSS that feeds training load: cycling only; power TSS first, then heart-rate TSS. */
export function chooseLoad(a: Pick<ActivitySummary, 'isCycling' | 'metrics' | 'hrLoad'>): ActivitySummary['load'] {
  if (!a.isCycling) return null;
  if (a.metrics?.tss != null) return { tss: a.metrics.tss, source: 'power' };
  if (a.hrLoad) return { tss: a.hrLoad.tss, source: 'hr' };
  return null;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

const hasValues = (c: readonly (number | null)[] | null): c is (number | null)[] =>
  !!c && c.some((v) => v !== null && v > 0);

/**
 * Per-activity inputs for the Records view: fastest elapsed time over each record distance (from
 * the device's cumulative distance) and the best 3-second average speed. Rides and runs only, each
 * with its own distances and glitch limit; whether an activity counts (outdoor only for speed
 * records) is decided when records are built.
 */
export function computeRideRecords(
  stream: ActivityStream,
  a: Pick<ActivitySummary, 'isCycling' | 'isRunning'>,
): ActivitySummary['records'] {
  const discipline = disciplineOf(a);
  if (!discipline) return null;
  const { distancesM, maxSpeedMps } = RECORD_INPUTS[discipline];
  const maxSpeed = stream.speed ? maxSustainedSpeed(stream.time, stream.speed, 3, maxSpeedMps) : null;
  const clean = stream.distance ? cleanDistance(stream.time, stream.distance, maxSpeedMps) : null;
  return {
    distanceBestsS: stream.distance
      ? bestDistanceEfforts(stream.time, stream.distance, distancesM, maxSpeedMps)
      : distancesM.map(() => null),
    maxSpeedMps: maxSpeed === null ? null : Math.round(maxSpeed * 1000) / 1000,
    distanceM: clean ? Math.round(clean.d.at(-1) ?? 0) : null,
    movingS: stream.speed ? streamMovingTime(stream.time, stream.speed) : null,
  };
}

/**
 * Time in power and heart-rate zones. Cycling only (the LTHR is a cycling threshold). Zones are
 * display-only, so before the first FTP/LTHR entry the earliest one is applied (`backApplied`);
 * TSS and training load never are.
 */
export function computeZones(
  stream: ActivityStream,
  a: Pick<ActivitySummary, 'date' | 'isCycling'>,
  ftpHistory: readonly FtpEntry[],
  lthrHistory: readonly LthrEntry[],
): ActivitySummary['zones'] {
  if (!a.isCycling) return { power: null, hr: null };
  const ftp = thresholdOn(ftpHistory, a.date);
  const lthr = thresholdOn(lthrHistory, a.date);
  return {
    power:
      ftp && hasValues(stream.power)
        ? {
            threshold: ftp.entry.watts,
            thresholdFrom: ftp.entry.from,
            backApplied: ftp.backApplied,
            seconds: timeInZones(powerSegments(stream.time, stream.power), ftp.entry.watts, POWER_ZONES),
          }
        : null,
    hr:
      lthr && hasValues(stream.hr)
        ? {
            threshold: lthr.entry.bpm,
            thresholdFrom: lthr.entry.from,
            backApplied: lthr.backApplied,
            seconds: timeInZones(hrSegments(stream.time, stream.hr), lthr.entry.bpm, HR_ZONES),
          }
        : null,
  };
}

/**
 * Power metrics from a stream. Null when the ride has no power. IF and TSS only when an
 * FTP is in effect on the ride's date; FTP is never back-dated.
 */
export function computePowerMetrics(
  stream: ActivityStream,
  date: string,
  ftpHistory: readonly FtpEntry[],
): Pick<ActivitySummary, 'metrics' | 'meanMaxPower' | 'hasPower'> {
  const power = stream.power;
  if (!power || !power.some((p) => p !== null && p > 0)) {
    return { metrics: null, meanMaxPower: null, hasPower: false };
  }
  const segments = powerSegments(stream.time, power);
  const np = normalizedPower(segments);
  const mmp = meanMaxPower(segments).map((w) => (w === null ? null : round1(w)));
  if (np === null) return { metrics: null, meanMaxPower: mmp, hasPower: true };

  const ridingTimeS = segmentsDuration(segments);
  const ftp = effectiveOn(ftpHistory, date)?.watts ?? null;
  return {
    hasPower: true,
    meanMaxPower: mmp,
    metrics: {
      np: round1(np),
      ridingTimeS,
      ftpUsed: ftp,
      intensityFactor: ftp ? round3(intensityFactor(np, ftp)) : null,
      tss: ftp ? round1(trainingStressScore(ridingTimeS, np, ftp)) : null,
    },
  };
}

/**
 * Bump when a formula or a derived file's shape changes in a way schema versions don't cover.
 * A different value in derived/manifest.json makes an incremental rebuild run in full.
 */
export const DERIVED_VERSION = 2;
const derivedVersion = () =>
  `${DERIVED_VERSION}:a${ACTIVITY_SCHEMA_VERSION}:s${STREAM_SCHEMA_VERSION}:r${ROUTE_SCHEMA_VERSION}:i${INDEX_SCHEMA_VERSION}`;

const sha1 = (bytes: Uint8Array | string) => createHash('sha1').update(bytes).digest('hex');

export type RebuildMode = 'full' | 'incremental';

interface RideInputs {
  ftpHistory: readonly FtpEntry[];
  lthrHistory: readonly LthrEntry[];
}

/** LTHR from the ride's best 20-minute power window, rounded to 0.1 bpm; null without power and heart rate. */
function computeLthrEstimate(stream: ActivityStream): { bpm: number; avgHr: number } | null {
  if (!stream.power || !stream.hr) return null;
  const estimate = estimateLthr(stream.time, stream.power, stream.hr);
  if (!estimate) return null;
  const round = (value: number) => Math.round(value * 10) / 10;
  return { bpm: round(estimate.lthr), avgHr: round(estimate.avgHr) };
}

/**
 * Aerobic decoupling for steady rides with heart rate: against power when the stream has power
 * (variability index up to 1.10), else against speed on fairly flat outdoor rides (a trainer's
 * speed is virtual). Other rides get none: intervals and hills make the number meaningless.
 */
function computeDecoupling(
  stream: ActivityStream,
  summary: ActivitySummary,
  power: ReturnType<typeof computePowerMetrics>,
) {
  if (!summary.isCycling || !stream.hr) return null;
  if (power.hasPower && stream.power) {
    if (!isSteadyPowerRide(power.metrics?.np ?? null, summary.avgPower)) return null;
    return aerobicDecoupling(stream.time, stream.hr, stream.power, 'power');
  }
  if (summary.isIndoor || !stream.speed) return null;
  if (!isSteadySpeedRide(summary.elevationGainM, summary.distanceM)) return null;
  return aerobicDecoupling(stream.time, stream.hr, stream.speed, 'speed');
}

/**
 * The kind of session a ride was, against the FTP behind its power zones (back-applied before the
 * first entry, like the zones: the type is display-only), or from its HR zones without power.
 */
export function computeWorkoutType(
  stream: ActivityStream,
  summary: Pick<ActivitySummary, 'isCycling' | 'isIndoor'>,
  zones: ActivitySummary['zones'],
  power: ReturnType<typeof computePowerMetrics>,
): ActivitySummary['workoutType'] {
  if (!summary.isCycling) return null;
  const ftp = zones.power?.threshold ?? null;
  const np = power.metrics?.np ?? null;
  const workIntervals = ftp !== null && stream.power ? workIntervalsOf(stream.time, stream.power, ftp) : [];
  return classifyWorkout({
    isIndoor: summary.isIndoor,
    powerZoneSeconds: zones.power?.seconds ?? null,
    intensityFactor: ftp !== null && np !== null ? np / ftp : null,
    workIntervals,
    hrZoneSeconds: zones.hr?.seconds ?? null,
  });
}

/** Summary fields computed from a stream (power metrics, HR load, zones, per-ride records). */
function fromStream(
  summary: ActivitySummary,
  stream: ActivityStream,
  { ftpHistory, lthrHistory }: RideInputs,
): ActivitySummary {
  const power = computePowerMetrics(stream, summary.date, ftpHistory);
  const zones = computeZones(stream, summary, ftpHistory, lthrHistory);
  return {
    ...summary,
    ...power,
    hrLoad: computeHrLoad(stream, summary.date, lthrHistory),
    zones,
    records: computeRideRecords(stream, summary),
    climbs: computeClimbs(stream, summary),
    hrPeak5s: stream.hr ? peakHr(stream.time, stream.hr) : null,
    lthrEstimate: computeLthrEstimate(stream),
    decoupling: computeDecoupling(stream, summary, power),
    workoutType: computeWorkoutType(stream, summary, zones, power),
  };
}

/**
 * Regenerates derived data from what's on disk, without calling Garmin: activities/, streams/
 * and routes/ from raw/ and fit/, then index.json and derived/ (daily load, heatmap, trends,
 * climbs, records, repeats, manifest).
 *
 * - `full` (default, `npm run rebuild`): clears all derived files and rebuilds every ride.
 * - `incremental` (after a sync): re-parses only rides whose raw summary or FIT file changed,
 *   recomputes rides whose FTP/LTHR inputs changed from their stored streams, and reuses the
 *   rest. Totals are always recomputed from all summaries. Falls back to full when there is no
 *   manifest or it was built with other formula/schema versions.
 *
 * Output is byte-identical between modes and across re-runs, apart from generatedAt.
 */
export async function rebuild(
  dataDir: string,
  log: (m: string) => void = () => {},
  { today = localToday(), mode = 'full' }: { today?: string; mode?: RebuildMode } = {},
): Promise<RebuildResult> {
  const rawDir = path.join(dataDir, 'raw');
  const activityStore = createActivityStore(dataDir);
  const streamStore = createStreamStore(dataDir);
  const routeStore = createRouteStore(dataDir);
  const loadStore = createLoadStore(dataDir);
  const fitStore = createFitStore(dataDir);
  const settings = createSettingsStore(dataDir);
  const manifestStore = createManifestStore(dataDir);
  const [ftpHistory, lthrHistory, app, weightHistory] = await Promise.all([
    settings.readFtp(),
    settings.readLthr(),
    settings.readApp(),
    settings.readWeight(),
  ]);
  const inputs: RideInputs = { ftpHistory, lthrHistory };
  const settingsHash = sha1(JSON.stringify({ ftpHistory, lthrHistory }));

  const previous = mode === 'incremental' ? await manifestStore.read() : null;
  const incremental = previous !== null && previous.derivedVersion === derivedVersion();
  if (mode === 'incremental' && !incremental) log('No usable manifest; rebuilding everything.');

  const files = (await readdir(rawDir).catch(() => [] as string[])).filter((f) => /^\d+\.json$/.test(f)).sort();
  const result: RebuildResult = {
    mode: incremental ? 'incremental' : 'full',
    activities: 0,
    withStreams: 0,
    withMetrics: 0,
    withLoad: 0,
    loadDays: 0,
    heatmapRoutes: 0,
    climbs: 0,
    repeatedWorkouts: 0,
    repeatedRoutes: 0,
    parsed: 0,
    recomputed: 0,
    reused: 0,
    withoutRecords: 0,
    failed: [],
  };
  const summaries: ActivitySummary[] = [];
  const manifest: Manifest = { schemaVersion: MANIFEST_SCHEMA_VERSION, derivedVersion: derivedVersion(), rides: {} };
  /** Simplified routes by id: just computed, or read back for reused rides. */
  const routes = new Map<string, ActivityRoute['points']>();

  if (!incremental)
    await Promise.all([activityStore.clear(), streamStore.clear(), routeStore.clear(), loadStore.clear()]);

  const rawIds = new Set(files.map((file) => file.replace(/\.json$/, '')));
  const mergeOf = mergesByRecording(await settings.readRideMerges(), rawIds, log);

  for (const file of files) {
    const id = file.replace(/\.json$/, '') as ActivityId;
    const merge = mergeOf.get(id);
    // A merge is built once, under its first recording's id; the later recordings are part of it.
    if (merge && merge[0] !== id) continue;
    const source = await readRideSource((merge ?? [id]) as ActivityId[], rawDir, fitStore);
    const hasFit = hasEveryFit(source);
    const entry: ManifestRide = { ...sourceFingerprint(source), settings: settingsHash };
    const before = incremental ? previous.rides[id] : undefined;
    const sameSource = before !== undefined && before.raw === entry.raw && before.fit === entry.fit;

    let summary: ActivitySummary | null = null;
    let reusedSummary: ActivitySummary | null = null;
    let error: string | undefined;
    let hasNoRecords = false;

    // 1) Nothing changed: reuse the stored summary (and route, for the heatmap).
    if (sameSource && before.settings === settingsHash) {
      summary = await activityStore.read(id);
      reusedSummary = summary;
      if (summary) {
        result.reused++;
        error = before.error;
        hasNoRecords = before.noRecords === true;
        const route = await routeStore.read(id);
        if (route) routes.set(id, route.points);
      }
    }

    if (!summary) {
      let base: ActivitySummary;
      try {
        base = baseSummaryOf(source);
      } catch (err) {
        result.failed.push({ id, error: err instanceof Error ? err.message : String(err) });
        log(`  ${id}: ${result.failed.at(-1)!.error}`);
        continue;
      }
      summary = base;

      // 2) Only FTP/LTHR changed: recompute from the stored stream, no FIT parsing.
      const stored = sameSource && hasFit ? await streamStore.read(id) : null;
      if (stored) {
        summary = fromStream(base, stored, inputs);
        result.recomputed++;
        const route = await routeStore.read(id);
        if (route) routes.set(id, route.points);
      } else if (hasFit) {
        // 3) New or changed source: parse the FIT file (every recording's, for a merge).
        result.parsed++;
        try {
          const decoded = decodeSource(source);
          const stream = toStreams(decoded.samples, decoded.laps);
          await streamStore.write(id, stream);
          const route = routeFromStream(stream.lat, stream.lng);
          if (route.length >= 2 && !base.isIndoor) {
            const points = simplifyRoute(route);
            await routeStore.write(id, { schemaVersion: ROUTE_SCHEMA_VERSION, points });
            routes.set(id, points);
          } else {
            await routeStore.remove(id);
          }
          summary = fromStream(base, stream, inputs);
        } catch (err) {
          // Keep the summary without metrics; report the FIT problem unless there was nothing to parse.
          if (err instanceof FitNoRecordsError) hasNoRecords = true;
          else error = `FIT: ${err instanceof Error ? err.message : String(err)}`;
          await Promise.all([streamStore.remove(id), routeStore.remove(id)]);
        }
      } else {
        result.recomputed++;
      }
      summary = { ...summary, load: chooseLoad(summary) };
      await activityStore.write(summary);
    }

    if (error) {
      entry.error = error;
      result.failed.push({ id, error });
      // Known problems of reused rides are counted, but only new ones are printed.
      if (summary !== reusedSummary) log(`  ${id}: ${error}`);
    }
    if (hasNoRecords) {
      entry.noRecords = true;
      result.withoutRecords++;
    }
    if (summary.metrics) result.withMetrics++;
    if (summary.load) result.withLoad++;
    const hasStreams = hasFit && !error && !hasNoRecords;
    if (hasStreams) result.withStreams++;
    manifest.rides[id] = entry;
    summaries.push(summary);
  }

  // Rides whose raw summary is gone: drop their derived files.
  if (incremental) {
    for (const id of Object.keys(previous.rides)) {
      if (manifest.rides[id]) continue;
      const aid = id as ActivityId;
      await Promise.all([activityStore.remove(aid), streamStore.remove(aid), routeStore.remove(aid)]);
      log(`  ${id}: removed (no longer in raw/)`);
    }
  }

  summaries.sort((a, b) => b.startTimeUtc.localeCompare(a.startTimeUtc) || b.id.localeCompare(a.id));
  const generatedAt = new Date().toISOString();
  await createIndexStore(dataDir).write({ schemaVersion: INDEX_SCHEMA_VERSION, generatedAt, activities: summaries });

  // Daily load from the first day with load through today; rest days count as 0. Cycling feeds
  // training load; the all-activities series adds heart-rate TSS from other sports, separately.
  const series = (loads: Array<{ date: string; tss: number }>) => {
    const first = loads.reduce<string | null>((min, l) => (min === null || l.date < min ? l.date : min), null);
    return first ? dailyLoad(loads, { from: first, to: today > first ? today : first }) : [];
  };
  const days = series(summaries.filter((a) => a.load).map((a) => ({ date: a.date, tss: a.load!.tss })));
  const allDays = series(
    summaries.flatMap((a) => (activityTss(a) === null ? [] : [{ date: a.date, tss: activityTss(a)! }])),
  );
  const r = (v: number) => Math.round(v * 10) / 10;
  const rounded = (d: (typeof days)[number]) => ({
    date: d.date,
    tss: r(d.tss),
    ctl: r(d.ctl),
    atl: r(d.atl),
    tsb: r(d.tsb),
  });
  await loadStore.write({
    schemaVersion: LOAD_SCHEMA_VERSION,
    generatedAt,
    days: days.map(rounded),
    allActivities: allDays.map(rounded),
  });

  // Heatmap: outdoor rides and runs with a route, privacy-trimmed by settings/app.json.
  const heatmapRoutes: HeatmapRoute[] = [];
  for (const a of summaries) {
    const points = routes.get(a.id);
    const discipline = disciplineOf(a);
    if (!points || !discipline || a.isIndoor) continue;
    const trimmed = trimRoute(points, app.privacyTrimM);
    if (trimmed.length < 2) continue;
    heatmapRoutes.push({ id: a.id, date: a.date, sport: a.sport, discipline, points: trimmed });
  }
  heatmapRoutes.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  await createHeatmapStore(dataDir).write({
    schemaVersion: HEATMAP_SCHEMA_VERSION,
    generatedAt,
    trimM: app.privacyTrimM,
    routes: heatmapRoutes,
  });
  await createTrendsStore(dataDir).write(buildTrends(summaries, { ftpHistory, weightHistory, today, generatedAt }));
  const climbs = await buildClimbs(summaries, (id) => streamStore.read(id as ActivityId), { generatedAt });
  await createClimbsStore(dataDir).write(climbs);
  await createRecordsStore(dataDir).write(buildRecords(summaries, { today, generatedAt, climbs: climbs.climbs }));
  const { workoutOverrides } = await settings.readRideGroups();
  const repeats = await buildRepeats(summaries, (id) => streamStore.read(id as ActivityId), workoutOverrides, routes, {
    generatedAt,
  });
  await createRepeatsStore(dataDir).write(repeats);
  // Written last: an interrupted rebuild leaves the old manifest, so the next run redoes the work.
  await manifestStore.write(manifest);

  result.activities = summaries.length;
  result.heatmapRoutes = heatmapRoutes.length;
  result.climbs = climbs.climbs.length;
  result.repeatedWorkouts = repeats.workouts.filter((workout) => workout.efforts.length > 1).length;
  result.repeatedRoutes = repeats.routes.length;
  result.loadDays = days.length;
  return result;
}

/** One-line rebuild summary for the CLIs. */
export function describeRebuild(r: RebuildResult): string {
  return (
    `Rebuilt (${r.mode}) ${r.activities} activities: ${r.parsed} parsed, ${r.recomputed} recomputed, ${r.reused} reused. ` +
    `${r.withStreams} with streams, ${r.withoutRecords} without recorded data, ${r.withMetrics} with power metrics, ${r.withLoad} with training load; ` +
    `${r.loadDays} days of daily load, ${r.heatmapRoutes} heatmap routes, ${r.climbs} climbs, ` +
    `${r.repeatedWorkouts} repeated workouts, ${r.repeatedRoutes} repeated routes; ${r.failed.length} problems`
  );
}
