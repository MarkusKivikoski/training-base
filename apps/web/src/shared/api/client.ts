import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@app/api';

/**
 * The only network client. Components use the query hooks in `shared/api/*` and each feature's
 * `api.ts`, never this directly.
 */
export const trpc = createTRPCClient<AppRouter>({
  // Batched GETs put every input in the URL; cap its length so big refreshes split instead of
  // failing with 414 (seen after a sync refetched every page's data at once).
  links: [httpBatchLink({ url: '/trpc', maxURLLength: 2000 })],
});

export type Activity = Awaited<ReturnType<typeof trpc.activities.get.query>>;
export type ActivityListInput = NonNullable<Parameters<typeof trpc.activities.list.query>[0]>;
/** A column the activities list can be sorted by. */
export type ActivitySortColumn = NonNullable<ActivityListInput['sort']>;
export type SortOrder = NonNullable<ActivityListInput['order']>;
export type CurrentSettings = Awaited<ReturnType<typeof trpc.settings.current.query>>;
export type ActivityStreams = Awaited<ReturnType<typeof trpc.activities.streams.query>>;
export type DayLoad = Awaited<ReturnType<typeof trpc.load.daily.query>>['days'][number];
export type HeatmapInput = NonNullable<Parameters<typeof trpc.heatmap.routes.query>[0]>;
export type HeatmapRoutes = Awaited<ReturnType<typeof trpc.heatmap.routes.query>>;
export type Trends = Awaited<ReturnType<typeof trpc.trends.get.query>>;
export type RecordsResponse = Awaited<ReturnType<typeof trpc.records.get.query>>;
export type RidePlace = Awaited<ReturnType<typeof trpc.records.forActivity.query>>[number];
export type Goal = Awaited<ReturnType<typeof trpc.goals.list.query>>[number];
export type ClimbSummary = Awaited<ReturnType<typeof trpc.climbs.list.query>>['climbs'][number];
export type ClimbDetail = Awaited<ReturnType<typeof trpc.climbs.get.query>>;
export type RideClimb = Awaited<ReturnType<typeof trpc.climbs.forActivity.query>>[number];
/** The indoor workout a ride belongs to, with every effort on it. */
export type RideWorkout = NonNullable<Awaited<ReturnType<typeof trpc.repeats.workoutForActivity.query>>>;
export type WorkoutEffort = RideWorkout['efforts'][number];
export type WorkoutSummary = Awaited<ReturnType<typeof trpc.repeats.workouts.query>>[number];
/** The repeated outdoor route a ride followed, with every effort on it. */
export type RideRoute = NonNullable<Awaited<ReturnType<typeof trpc.repeats.routeForActivity.query>>>;
export type RouteEffort = RideRoute['efforts'][number];
export type SyncJobStatus = Awaited<ReturnType<typeof trpc.settingsEdit.save.mutate>>;
export type Plan = Awaited<ReturnType<typeof trpc.plan.get.query>>;
export type PlannedSession = Plan['sessions'][number];
export type PlanPresets = Plan['presets'];
export type PlannedEvent = Plan['events'][number];
export type Gear = Awaited<ReturnType<typeof trpc.gear.get.query>>;
export type Bike = Gear['bikes'][number];
export type GearComponent = Gear['components'][number];
export type Tyre = Gear['tyres'][number];
