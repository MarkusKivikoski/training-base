import { efficiencyFactor, speedTrend, type SpeedTrend } from '@app/metrics';
import type { Gear, RideRoute, RouteEffort } from '@/shared/api/client';
import { ordinal } from '@/shared/lib/climbs';
import { tyreFor } from '@/shared/lib/gear';
import {
  formatDate,
  formatDistance,
  formatHeartRate,
  formatHeartRateChange,
  formatPercentChange,
  formatPower,
  formatSpeed,
} from '@/shared/lib/formatters';
import type { EffortChartPoint, EffortPanel } from './effortChart';

const KMH_PER_MPS = 3.6;

const SPEED_PANEL: EffortPanel = { title: 'Speed', unit: 'km/h', slot: '--series-4' };
const POWER_PANEL: EffortPanel = { title: 'Power', unit: 'W', slot: '--series-1' };
const HEART_RATE_PANEL: EffortPanel = { title: 'Heart rate', unit: 'bpm', slot: '--series-2' };

const HEADLINES: Record<SpeedTrend, string> = {
  faster: 'Faster than before',
  same: 'About the same speed as before',
  slower: 'Slower than before',
};

/** The name the user gave the route, or its length: "37.1 km route". */
export const routeTitle = (route: Pick<RideRoute, 'name' | 'distanceM'>): string =>
  route.name ?? `${formatDistance(route.distanceM)} route`;

export type RouteEffortRow = {
  effort: RouteEffort;
  /** Normalized power per heartbeat; null without a power meter or heart rate. */
  wattsPerBeat: number | null;
  /** Effort rating (1–10) from the ride's note. */
  rating: number | null;
  /** The name of the tyres the ride was tagged with; null when untagged. */
  tyres: string | null;
  isCurrent: boolean;
};

/**
 * One row per effort on the route, newest first, marking the ride being viewed. `gear` gives the
 * tyres each ride was tagged with; while it is still loading the rows have none.
 */
export const routeEffortRows = (route: RideRoute, activityId: string, gear: Gear | undefined): RouteEffortRow[] => {
  const rows = route.efforts.map((effort): RouteEffortRow => ({
    effort,
    wattsPerBeat: efficiencyFactor(effort.np, effort.avgHr),
    rating: route.ratings[effort.activityId] ?? null,
    tyres: gear ? (tyreFor(effort.activityId, gear)?.name ?? null) : null,
    isCurrent: effort.activityId === activityId,
  }));
  return rows.reverse();
};

/** Whether any effort on the route is tagged with its tyres: the tyres column shows only then. */
export const hasTaggedTyres = (rows: readonly RouteEffortRow[]): boolean => rows.some((row) => row.tyres !== null);

/** Whether any effort on the route was ridden with a power meter: power is shown only then. */
export const hasPowerEfforts = (rows: readonly RouteEffortRow[]): boolean => rows.some((row) => row.effort.np !== null);

/**
 * The route chart: speed, then power when any effort has it, then heart rate, with the efforts as
 * points oldest first (values in panel order). `rows` are newest first.
 */
export const routeChart = (rows: readonly RouteEffortRow[]): { panels: EffortPanel[]; points: EffortChartPoint[] } => {
  const showsPower = hasPowerEfforts(rows);
  const panels = showsPower ? [SPEED_PANEL, POWER_PANEL, HEART_RATE_PANEL] : [SPEED_PANEL, HEART_RATE_PANEL];

  const oldestFirst = [...rows].reverse();
  const points = oldestFirst.map(({ effort, isCurrent }): EffortChartPoint => {
    const speedKmh = Math.round(effort.speedMps * KMH_PER_MPS * 10) / 10;
    const power = effort.np === null ? '' : `, <b>${formatPower(effort.np)}</b>`;
    const heartRate = effort.avgHr === null ? '' : ` at <b>${formatHeartRate(effort.avgHr)}</b>`;
    return {
      date: effort.date,
      isCurrent,
      values: showsPower ? [speedKmh, effort.np, effort.avgHr] : [speedKmh, effort.avgHr],
      tooltip: `${formatDate(effort.date)}: <b>${formatSpeed(effort.speedMps)}</b>${power}${heartRate}`,
    };
  });
  return { panels, points };
};

/** "Fastest of 9", "2nd fastest of 9". */
export const rankText = (rank: number, effortCount: number): string =>
  rank === 1 ? `Fastest of ${effortCount}` : `${ordinal(rank)} fastest of ${effortCount}`;

export type RouteVerdict = {
  headline: string;
  detail: string;
  /** How power per heartbeat changed, among the efforts with a power meter; null without one. */
  powerDetail: string | null;
};

const powerDetailOf = (powerChange: RouteEffort['powerChange']): string | null => {
  if (!powerChange) return null;
  const against =
    powerChange.againstCount === 1
      ? 'your previous effort with power'
      : `the median of your previous ${powerChange.againstCount} efforts with power`;
  return `Power per heartbeat ${formatPercentChange(powerChange.efficiencyPct)} against ${against}: power ${formatPercentChange(powerChange.powerPct)}, heart rate ${formatHeartRateChange(powerChange.hrBpm)}.`;
};

/** How this effort compares with the ones before it on the route, in words, with its rank. */
export const routeVerdict = (effort: RouteEffort, effortCount: number): RouteVerdict => {
  const rank = `${rankText(effort.rank, effortCount)}.`;
  const powerDetail = powerDetailOf(effort.powerChange);
  const { change } = effort;
  if (!change) return { headline: 'The first ride on this route', detail: rank, powerDetail };

  const against =
    change.againstCount === 1 ? 'your previous effort' : `the median of your previous ${change.againstCount} efforts`;
  const heartRate = change.hrBpm === null ? '' : `, heart rate ${formatHeartRateChange(change.hrBpm)}`;
  return {
    headline: HEADLINES[speedTrend(change.speedPct)],
    detail: `${formatPercentChange(change.speedPct)} against ${against}${heartRate}. ${rank}`,
    powerDetail,
  };
};
