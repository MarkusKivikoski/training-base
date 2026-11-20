import {
  alignWorkouts,
  closestWorkout,
  comparableWorkBlocks,
  detectIntervals,
  effortChange,
  groupWorkouts,
  newWorkoutGroup,
  workBlockStats,
  workoutProfile,
  workSummary,
  type EffortOutput,
  type LngLat,
  type StreamLike,
  type TimeRange,
  type WorkoutAlignment,
  type WorkoutGroup as MatchedGroup,
} from '@app/metrics';
import {
  REPEATS_SCHEMA_VERSION,
  type ActivityStream,
  type ActivitySummary,
  type RepeatsFile,
  type WorkoutEffort,
  type WorkoutGroup,
  type WorkoutOverride,
} from '@app/shared';
import { buildRouteGroups } from './repeatRoutes.js';

/** A powered indoor ride, with what matching and the per-effort numbers need from its stream. */
interface WorkoutRide {
  summary: ActivitySummary;
  channels: StreamLike;
  profile: number[];
}

const round = (value: number | null, digits: number): number | null => {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const oldestFirst = (a: ActivitySummary, b: ActivitySummary) =>
  a.startTimeUtc.localeCompare(b.startTimeUtc) || a.id.localeCompare(b.id);

export const workoutGroupId = (referenceId: string) => `workout-${referenceId}`;

/** Indoor rides recorded with power: the only rides a workout can be recognised from. */
export const isWorkoutRide = (a: Pick<ActivitySummary, 'isCycling' | 'isIndoor' | 'hasPower'>): boolean =>
  a.isCycling && a.isIndoor && a.hasPower;

/** The FTP the reference ride's work blocks are measured against: the one behind its zones, else its TSS. */
const referenceFtp = (a: ActivitySummary): number | null => a.zones.power?.threshold ?? a.metrics?.ftpUsed ?? null;

async function loadWorkoutRides(
  summaries: readonly ActivitySummary[],
  readStream: (id: ActivitySummary['id']) => Promise<ActivityStream | null>,
): Promise<WorkoutRide[]> {
  const rides: WorkoutRide[] = [];
  for (const summary of summaries.filter(isWorkoutRide).sort(oldestFirst)) {
    const stream = await readStream(summary.id);
    if (!stream) continue;
    const profile = workoutProfile(stream.time, stream.power);
    if (profile.length === 0) continue;
    // Only time, power and heart rate are kept, so every stream doesn't stay in memory whole.
    const channels: StreamLike = {
      time: stream.time,
      power: stream.power,
      hr: stream.hr,
      cadence: null,
      distance: null,
    };
    rides.push({ summary, channels, profile });
  }
  return rides;
}

/**
 * Groups the rides into workouts. Rides without an override are matched by their power profile
 * (those set to "own" each start a group). Rides placed in a workout by hand are then added to
 * it; when that workout doesn't exist any more, or the ride can't be lined up with it at all,
 * the ride is matched like the others. Returns the hand-placed members.
 */
function groupWithOverrides(
  rides: readonly WorkoutRide[],
  overrides: Readonly<Record<string, WorkoutOverride>>,
): { groups: Array<MatchedGroup<WorkoutRide>>; manual: Set<string> } {
  const overrideOf = (ride: WorkoutRide) => overrides[ride.summary.id];
  const isPlacedByHand = (ride: WorkoutRide) => overrideOf(ride) !== undefined && overrideOf(ride) !== 'own';

  const groups = groupWorkouts(
    rides.filter((ride) => !isPlacedByHand(ride)),
    { isKeptApart: (ride) => overrideOf(ride) === 'own' },
  );
  const manual = new Set<string>();

  for (const ride of rides.filter(isPlacedByHand)) {
    const target = groups.find((group) => workoutGroupId(group.reference.summary.id) === overrideOf(ride));
    const alignment = target ? alignWorkouts(target.reference.profile, ride.profile) : null;
    if (target && alignment) {
      target.members.push({ ride, alignment });
      manual.add(ride.summary.id);
      continue;
    }
    const closest = closestWorkout(groups, ride);
    if (closest) closest.group.members.push({ ride, alignment: closest.alignment });
    else groups.push(newWorkoutGroup(ride));
  }

  for (const group of groups) group.members.sort((a, b) => oldestFirst(a.ride.summary, b.ride.summary));
  groups.sort((a, b) => oldestFirst(a.reference.summary, b.reference.summary));
  return { groups, manual };
}

/** One ride's numbers on its workout, without the comparison against earlier efforts. */
function effortOf(
  { summary, channels }: WorkoutRide,
  alignment: WorkoutAlignment,
  blocks: readonly TimeRange[],
  isManual: boolean,
): Omit<WorkoutEffort, 'change'> {
  const blockStats = blocks.map((block) => workBlockStats(channels, block, alignment.offsetS));
  const work = blocks.length > 0 ? workSummary(blocks, blockStats) : null;
  return {
    activityId: summary.id,
    date: summary.date,
    offsetS: alignment.offsetS,
    difference: round(alignment.difference, 3)!,
    isManual,
    durationS: summary.durationS,
    avgPower: round(summary.avgPower, 1),
    np: round(summary.metrics?.np ?? null, 1),
    avgHr: round(summary.avgHr, 1),
    decouplingPercent: summary.decoupling?.percent ?? null,
    blocks: blockStats.map((stats) =>
      stats ? { avgPower: round(stats.avgPower, 1), avgHr: round(stats.avgHr, 1), endHr: round(stats.endHr, 1) } : null,
    ),
    work: work ? { avgPower: round(work.avgPower, 1), avgHr: round(work.avgHr, 1) } : null,
  };
}

/**
 * What an effort is compared on: its work blocks when the workout has them and the ride covered
 * every one (a ride cut short isn't comparable), else NP and average heart rate.
 */
function comparedOutput(effort: Omit<WorkoutEffort, 'change'>, hasBlocks: boolean): EffortOutput {
  if (!hasBlocks) return { power: effort.np, hr: effort.avgHr };
  const coversEveryBlock = effort.blocks.every((block) => block !== null);
  if (!coversEveryBlock || !effort.work) return { power: null, hr: null };
  return { power: effort.work.avgPower, hr: effort.work.avgHr };
}

function workoutOf(group: MatchedGroup<WorkoutRide>, manual: ReadonlySet<string>): WorkoutGroup {
  const { summary, channels } = group.reference;
  const ftp = referenceFtp(summary);
  const detected = ftp && channels.power ? detectIntervals(channels.time, channels.power, ftp) : [];
  const blocks = comparableWorkBlocks(detected);

  const efforts: WorkoutEffort[] = [];
  const earlierOutputs: EffortOutput[] = [];
  for (const { ride, alignment } of group.members) {
    const effort = effortOf(ride, alignment, blocks, manual.has(ride.summary.id));
    const output = comparedOutput(effort, blocks.length > 0);
    const change = effortChange(output, earlierOutputs);
    efforts.push({
      ...effort,
      change: change && {
        againstCount: change.againstCount,
        powerPct: round(change.powerPct, 1)!,
        hrBpm: round(change.hrBpm, 1)!,
        efficiencyPct: round(change.efficiencyPct, 1)!,
      },
    });
    earlierOutputs.push(output);
  }

  return { id: workoutGroupId(summary.id), referenceId: summary.id, durationS: summary.durationS, blocks, efforts };
}

/**
 * Builds derived/repeats.json. Indoor rides with power are grouped into workouts by their power
 * profile (the first ride of a workout defines it), with every ride's numbers over the workout's
 * work blocks and how each compares with the efforts before it; `overrides` are the rides placed
 * by hand (settings/ride-groups.json). Outdoor rides are grouped into routes by their line
 * (`routes`, the simplified lines by activity id; see buildRouteGroups). Reads the stream of every
 * powered indoor ride once.
 */
export async function buildRepeats(
  summaries: readonly ActivitySummary[],
  readStream: (id: ActivitySummary['id']) => Promise<ActivityStream | null>,
  overrides: Readonly<Record<string, WorkoutOverride>>,
  routes: ReadonlyMap<string, ReadonlyArray<LngLat>>,
  { generatedAt }: { generatedAt: string },
): Promise<RepeatsFile> {
  const rides = await loadWorkoutRides(summaries, readStream);
  const { groups, manual } = groupWithOverrides(rides, overrides);
  return {
    schemaVersion: REPEATS_SCHEMA_VERSION,
    generatedAt,
    workouts: groups.map((group) => workoutOf(group, manual)),
    routes: buildRouteGroups(summaries, routes),
  };
}
