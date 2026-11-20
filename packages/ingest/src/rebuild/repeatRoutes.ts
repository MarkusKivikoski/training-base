import {
  effortChange,
  groupRoutes,
  routeSignature,
  speedChange,
  type EffortOutput,
  type LngLat,
  type RouteEffortOutput,
  type RouteGroup as MatchedRoute,
  type RouteSignature,
} from '@app/metrics';
import type { ActivitySummary, RouteEffort, RouteGroup } from '@app/shared';

/** An outdoor ride with a route line, and what matching and the per-effort numbers need. */
interface RouteRide {
  summary: ActivitySummary;
  signature: RouteSignature;
  distanceM: number;
  movingS: number;
}

const round = (value: number | null, digits: number): number | null => {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const oldestFirst = (a: ActivitySummary, b: ActivitySummary) =>
  a.startTimeUtc.localeCompare(b.startTimeUtc) || a.id.localeCompare(b.id);

export const routeGroupId = (referenceId: string) => `route-${referenceId}`;

/**
 * Outdoor rides that can be matched by route: with a line of at least two points, a distance and
 * a moving time. Distance and moving time come from the stream (GPS glitches and stops removed)
 * when the ride has them, else from Garmin's summary.
 */
function routeRides(
  summaries: readonly ActivitySummary[],
  routes: ReadonlyMap<string, ReadonlyArray<LngLat>>,
): RouteRide[] {
  const rides: RouteRide[] = [];
  const outdoorRides = summaries.filter((a) => a.isCycling && !a.isIndoor).sort(oldestFirst);
  for (const summary of outdoorRides) {
    const points = routes.get(summary.id);
    const distanceM = summary.records?.distanceM ?? summary.distanceM;
    const movingS = summary.records?.movingS ?? summary.movingDurationS ?? summary.durationS;
    if (!points || points.length < 2 || !distanceM || !movingS) continue;
    rides.push({ summary, signature: routeSignature(points), distanceM, movingS });
  }
  return rides;
}

/** Rank by speed, fastest first; equal speeds rank the older ride higher. */
function speedRanks(members: readonly RouteRide[]): Map<string, number> {
  const speedOf = (ride: RouteRide) => ride.distanceM / ride.movingS;
  const fastestFirst = [...members].sort((a, b) => speedOf(b) - speedOf(a) || oldestFirst(a.summary, b.summary));
  return new Map(fastestFirst.map((ride, index) => [ride.summary.id, index + 1]));
}

function routeOf(group: MatchedRoute<RouteRide>): RouteGroup {
  const ranks = speedRanks(group.members);
  const efforts: RouteEffort[] = [];
  const earlierOutputs: RouteEffortOutput[] = [];
  // Power is compared only among the efforts ridden with a power meter (and heart rate).
  const earlierPowerOutputs: EffortOutput[] = [];

  for (const { summary, distanceM, movingS } of group.members) {
    const output: RouteEffortOutput = { speed: distanceM / movingS, hr: summary.avgHr };
    const change = speedChange(output, earlierOutputs);
    const powerOutput: EffortOutput = { power: summary.metrics?.np ?? null, hr: summary.avgHr };
    const powerChange = effortChange(powerOutput, earlierPowerOutputs);
    efforts.push({
      activityId: summary.id,
      date: summary.date,
      distanceM: Math.round(distanceM),
      movingS: Math.round(movingS),
      speedMps: round(distanceM / movingS, 3)!,
      avgHr: round(summary.avgHr, 1),
      avgPower: round(summary.hasPower ? summary.avgPower : null, 1),
      np: round(summary.metrics?.np ?? null, 1),
      rank: ranks.get(summary.id)!,
      change: change && {
        againstCount: change.againstCount,
        speedPct: round(change.speedPct, 1)!,
        hrBpm: round(change.hrBpm, 1),
      },
      powerChange: powerChange && {
        againstCount: powerChange.againstCount,
        powerPct: round(powerChange.powerPct, 1)!,
        hrBpm: round(powerChange.hrBpm, 1)!,
        efficiencyPct: round(powerChange.efficiencyPct, 1)!,
      },
    });
    earlierOutputs.push(output);
    earlierPowerOutputs.push(powerOutput);
  }

  const { summary, distanceM } = group.reference;
  return { id: routeGroupId(summary.id), referenceId: summary.id, distanceM: Math.round(distanceM), efforts };
}

/**
 * Outdoor routes ridden more than once: rides that follow the same roads from start to finish
 * the same way round as an earlier ride of the route, each with its moving speed, its rank
 * and how it compares with the efforts before it: on speed always, and on power per heartbeat
 * among the efforts ridden with a power meter. `routes` are the simplified lines by activity
 * id. No streams are read.
 */
export function buildRouteGroups(
  summaries: readonly ActivitySummary[],
  routes: ReadonlyMap<string, ReadonlyArray<LngLat>>,
): RouteGroup[] {
  const groups = groupRoutes(routeRides(summaries, routes));
  return groups.filter((group) => group.members.length > 1).map(routeOf);
}
