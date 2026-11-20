import type { RideMeanMax } from './combine.js';
import { MEAN_MAX_DURATIONS_S } from './power.js';
import { thresholdSuggestion, type ThresholdCandidate } from './thresholdSuggestion.js';

/** FTP from a 20-minute best, as in the Coggan test and eFTP (CLAUDE.md). */
export const FTP_FROM_TWENTY_MIN = 0.95;

/** A new FTP is suggested only when it beats the current one by at least this much. */
export const MIN_FTP_RISE_W = 3;

/** LTHR moves slowly, so a smaller rise is worth suggesting. */
export const MIN_LTHR_RISE_BPM = 2;

const TWENTY_MIN_INDEX = MEAN_MAX_DURATIONS_S.indexOf(1200);

export interface FtpSetting {
  from: string;
  watts: number;
}

export interface FtpSuggestion {
  activityId: string;
  name: string | undefined;
  /** The ride's date; the new FTP would apply from it. */
  date: string;
  /** The ride's best 20-minute average power, W. */
  bestTwentyMinW: number;
  /** The FTP in effect today, or null when none is set. */
  currentFtp: number | null;
  /** 95 % of the 20-minute best, rounded to whole watts. */
  newFtp: number;
}

interface SuggestionOptions {
  today: string;
  /** Rides whose suggestion was declined; they're never suggested again. */
  dismissedRideIds?: readonly string[];
}

/**
 * A new FTP from a recent ride's own 20-minute best (95 % of it), when that beats the FTP in
 * effect today by MIN_FTP_RISE_W or more. Only rides after the current FTP entry's date count:
 * earlier rides were already known when that FTP was set. With several candidates the highest
 * wins (the earlier ride on a tie). With no FTP set, any ride with a 20-minute best is a
 * candidate. Returns null when there's nothing to suggest.
 */
export function ftpSuggestion(
  rides: readonly RideMeanMax[],
  ftpHistory: readonly FtpSetting[],
  { today, dismissedRideIds }: SuggestionOptions,
): FtpSuggestion | null {
  const candidates: ThresholdCandidate[] = [];
  for (const ride of rides) {
    const bestTwentyMinW = ride.meanMaxPower?.[TWENTY_MIN_INDEX];
    if (bestTwentyMinW == null) continue;
    const suggested = Math.round(bestTwentyMinW * FTP_FROM_TWENTY_MIN);
    candidates.push({ id: ride.id, date: ride.date, name: ride.name, suggested, basis: bestTwentyMinW });
  }

  const history = ftpHistory.map((entry) => ({ from: entry.from, value: entry.watts }));
  const result = thresholdSuggestion(candidates, history, { today, dismissedRideIds, minRise: MIN_FTP_RISE_W });
  if (!result) return null;
  return {
    activityId: result.activityId,
    name: result.name,
    date: result.date,
    bestTwentyMinW: result.basis,
    currentFtp: result.current,
    newFtp: result.suggested,
  };
}

/** A ride with its stored LTHR estimate (see `lthrEstimate` on activities). */
export interface RideLthrEstimate {
  id: string;
  date: string;
  name?: string | undefined;
  lthrEstimate: { bpm: number; avgHr: number } | null;
}

export interface LthrSuggestion {
  activityId: string;
  name: string | undefined;
  date: string;
  /** Average heart rate during the ride's best 20-minute power window, bpm. */
  avgHr: number;
  currentLthr: number | null;
  /** 95 % of that heart rate, rounded to whole bpm. */
  newLthr: number;
}

/**
 * A new LTHR from a recent ride: 95 % of its heart rate during the best 20-minute power window
 * (the same estimate as `npm run estimate-lthr`), when that beats the LTHR in effect today by
 * MIN_LTHR_RISE_BPM or more. The same rules as ftpSuggestion otherwise.
 */
export function lthrSuggestion(
  rides: readonly RideLthrEstimate[],
  lthrHistory: ReadonlyArray<{ from: string; bpm: number }>,
  { today, dismissedRideIds }: SuggestionOptions,
): LthrSuggestion | null {
  const candidates: ThresholdCandidate[] = [];
  for (const ride of rides) {
    if (!ride.lthrEstimate) continue;
    const suggested = Math.round(ride.lthrEstimate.bpm);
    candidates.push({ id: ride.id, date: ride.date, name: ride.name, suggested, basis: ride.lthrEstimate.avgHr });
  }

  const history = lthrHistory.map((entry) => ({ from: entry.from, value: entry.bpm }));
  const result = thresholdSuggestion(candidates, history, { today, dismissedRideIds, minRise: MIN_LTHR_RISE_BPM });
  if (!result) return null;
  return {
    activityId: result.activityId,
    name: result.name,
    date: result.date,
    avgHr: result.basis,
    currentLthr: result.current,
    newLthr: result.suggested,
  };
}
