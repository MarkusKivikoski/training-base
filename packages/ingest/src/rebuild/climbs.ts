import {
  climbCandidates,
  detectClimbs,
  duplicateClimbs,
  findClimbPasses,
  groupClimbs,
  rangeStats,
  type DetectedClimb,
} from '@app/metrics';
import {
  CLIMBS_SCHEMA_VERSION,
  type ActivityStream,
  type ActivitySummary,
  type Climb,
  type ClimbEffort,
  type ClimbsFile,
} from '@app/shared';
import { simplifyRoute } from '../fit/simplifyRoute.js';

const hasChannel = (c: readonly (number | null)[] | null) => !!c && c.some((v) => v !== null);

/** Climbs in an outdoor ride; null for indoor rides, other sports, or rides without GPS, altitude or distance. */
export function computeClimbs(
  stream: ActivityStream,
  a: Pick<ActivitySummary, 'isCycling' | 'isIndoor'>,
): ActivitySummary['climbs'] {
  if (!a.isCycling || a.isIndoor) return null;
  if (
    !hasChannel(stream.lat) ||
    !hasChannel(stream.lng) ||
    !hasChannel(stream.altitude) ||
    !hasChannel(stream.distance)
  )
    return null;
  return detectClimbs(stream);
}

/** The climb's line and elevation profile from its reference ride's stream. */
function shape(stream: ActivityStream, c: DetectedClimb): Pick<Climb, 'path' | 'profile'> {
  const line: Array<[number, number]> = [];
  const profile: Array<[number, number]> = [];
  let d0: number | null = null;
  let lastD = -Infinity;
  for (let i = 0; i < stream.time.length; i++) {
    const t = stream.time[i]!;
    if (t < c.startS || t > c.endS) continue;
    const lat = stream.lat?.[i];
    const lng = stream.lng?.[i];
    if (lat != null && lng != null) line.push([lng, lat]);
    const d = stream.distance?.[i];
    const alt = stream.altitude?.[i];
    if (d == null || alt == null) continue;
    d0 ??= d;
    if (d - d0 - lastD >= 10 || t === c.endS) {
      lastD = d - d0;
      profile.push([Math.round(lastD), Math.round(alt * 10) / 10]);
    }
  }
  return { path: simplifyRoute(line, 3), profile };
}

/**
 * Builds derived/climbs.json: climbs detected in outdoor rides, grouped into distinct hills (the
 * first ride a hill was detected in defines it), and every pass over each one from any outdoor
 * ride, ranked by elapsed time. Near-duplicates (the same hill with shifted end points) are merged. Reads the stream of every outdoor ride with GPS once.
 */
export async function buildClimbs(
  summaries: readonly ActivitySummary[],
  readStream: (id: ActivitySummary['id']) => Promise<ActivityStream | null>,
  { generatedAt }: { generatedAt: string },
): Promise<ClimbsFile> {
  const rides = summaries
    .filter((a) => a.climbs !== null)
    .sort((a, b) => a.startTimeUtc.localeCompare(b.startTimeUtc) || a.id.localeCompare(b.id));
  const detected = rides.flatMap((a) => a.climbs!.map((c, n) => ({ ...c, id: `${a.id}-${n}`, activityId: a.id })));
  const groups = groupClimbs(detected);
  const refs = groups.map((g) => g.ref);
  const efforts: Array<Omit<ClimbEffort, 'rank'>[]> = groups.map(() => []);
  const shapes: Array<Pick<Climb, 'path' | 'profile'> | null> = groups.map(() => null);
  const refsByRide = new Map<string, number[]>();
  refs.forEach((r, k) => refsByRide.set(r.activityId, [...(refsByRide.get(r.activityId) ?? []), k]));

  for (const a of rides) {
    const stream = await readStream(a.id);
    if (!stream) continue;
    for (const k of refsByRide.get(a.id) ?? []) shapes[k] = shape(stream, refs[k]!);
    for (const k of climbCandidates(stream, refs)) {
      for (const pass of findClimbPasses(stream, refs[k]!)) {
        const stats = rangeStats(stream, { startS: pass.startS, endS: pass.endS });
        efforts[k]!.push({
          activityId: a.id,
          date: a.date,
          name: a.name,
          startS: pass.startS,
          timeS: pass.endS - pass.startS,
          avgPower: a.hasPower && stats.avgPower !== null ? Math.round(stats.avgPower) : null,
          avgHr: stats.avgHr === null ? null : Math.round(stats.avgHr),
        });
      }
    }
  }

  // The same hill found with slightly different end points: keep the one with the most passes.
  const duplicates = duplicateClimbs(
    efforts.map((list) => list.map((e) => ({ activityId: e.activityId, startS: e.startS, endS: e.startS + e.timeS }))),
  );
  const climbs: Climb[] = [];
  groups.forEach((g, k) => {
    const list = efforts[k]!;
    if (list.length === 0 || !shapes[k] || duplicates.has(k)) return; // the reference ride's own pass should always match
    const order = list
      .map((e, i) => ({ e, i }))
      .sort((x, y) => x.e.timeS - y.e.timeS || x.e.date.localeCompare(y.e.date));
    const rank = new Map(order.map((x, r) => [x.i, r + 1]));
    const { ref } = g;
    climbs.push({
      id: ref.id,
      lengthM: ref.lengthM,
      gainM: ref.gainM,
      avgGrade: ref.avgGrade,
      maxGrade: ref.maxGrade,
      score: ref.score,
      start: ref.start,
      end: ref.end,
      ...shapes[k]!,
      efforts: list.map((e, i) => ({ ...e, rank: rank.get(i)! })),
    });
  });
  return { schemaVersion: CLIMBS_SCHEMA_VERSION, generatedAt, climbs };
}
