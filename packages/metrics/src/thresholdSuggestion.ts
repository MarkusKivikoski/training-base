/** An effective-dated threshold setting (FTP in W, LTHR in bpm). */
export interface ThresholdSetting {
  from: string;
  value: number;
}

/** What one ride suggests the threshold should be. */
export interface ThresholdCandidate {
  id: string;
  date: string;
  name?: string | undefined;
  /** The suggested threshold, already rounded. */
  suggested: number;
  /** The ride figure it comes from (e.g. the 20-minute best). */
  basis: number;
}

export interface ThresholdSuggestionResult {
  activityId: string;
  name: string | undefined;
  /** The ride's date; the new threshold would apply from it. */
  date: string;
  basis: number;
  /** The threshold in effect today, or null when none is set. */
  current: number | null;
  suggested: number;
}

interface ThresholdOptions {
  today: string;
  /** Rides whose suggestion was declined; they're never suggested again. */
  dismissedRideIds?: readonly string[] | undefined;
  /** The suggestion must beat the current threshold by at least this much. */
  minRise: number;
}

/** The entry in effect on `date`: the latest one starting on or before it. */
function settingOn(history: readonly ThresholdSetting[], date: string): ThresholdSetting | null {
  let current: ThresholdSetting | null = null;
  for (const entry of history) {
    const isInEffect = entry.from <= date;
    const isLater = current === null || entry.from > current.from;
    if (isInEffect && isLater) current = entry;
  }
  return current;
}

/**
 * The highest suggestion from rides after the current threshold entry (earlier rides were already
 * known when it was set), up to today and not declined, when it beats the current threshold by
 * `minRise` or more. The earlier ride wins a tie. With no threshold set, any ride counts.
 */
export function thresholdSuggestion(
  candidates: readonly ThresholdCandidate[],
  history: readonly ThresholdSetting[],
  { today, dismissedRideIds = [], minRise }: ThresholdOptions,
): ThresholdSuggestionResult | null {
  const current = settingOn(history, today);
  const dismissed = new Set(dismissedRideIds);
  let best: ThresholdCandidate | null = null;

  for (const candidate of candidates) {
    const isAfterCurrent = current === null || candidate.date > current.from;
    if (!isAfterCurrent || candidate.date > today || dismissed.has(candidate.id)) continue;

    const isHigher =
      best === null ||
      candidate.suggested > best.suggested ||
      (candidate.suggested === best.suggested && candidate.date < best.date);
    if (isHigher) best = candidate;
  }

  if (!best) return null;
  if (current && best.suggested < current.value + minRise) return null;
  return {
    activityId: best.id,
    name: best.name,
    date: best.date,
    basis: best.basis,
    current: current?.value ?? null,
    suggested: best.suggested,
  };
}
