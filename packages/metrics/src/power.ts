/** Durations (seconds) for mean-max power, from CLAUDE.md. */
export const MEAN_MAX_DURATIONS_S = [1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 5400, 7200] as const;

export interface PowerSegmentOptions {
  /**
   * Gaps between records up to this many seconds are recording gaps (e.g. smart
   * recording) and are linearly interpolated.
   */
  sampleGapS?: number;
  /** Longer gaps up to this many seconds are zero-filled (stopped but still riding). */
  maxGapS?: number;
}

/**
 * Builds contiguous 1 Hz power segments from recorded samples.
 *
 * - A record without a power value counts as 0 W.
 * - Gaps up to `sampleGapS` (default 3 s) are interpolated.
 * - Gaps up to `maxGapS` (default 30 s) are zero-filled.
 * - Longer gaps are pauses: they end the segment, so no window spans a pause.
 *
 * Thresholds were checked against real files (2026-11-05): the Edge 1030 records at
 * 1 Hz with rare pauses; smart-recording watches leave 2-30 s gaps but have no power.
 */
export function powerSegments(
  time: readonly number[],
  power: readonly (number | null)[],
  options: PowerSegmentOptions = {},
): number[][] {
  return segments(time, power, { ...options, fill: 'zero' });
}

export interface SegmentOptions extends PowerSegmentOptions {
  /**
   * How 4-30 s gaps are bridged, and what a record missing this channel means:
   * - 'zero' (power): missing values count as 0, gaps are zero-filled;
   * - 'hold' (heart rate): records without a value are skipped, gaps hold the last value.
   */
  fill: 'zero' | 'hold';
}

/** Shared 1 Hz segmenter behind powerSegments and hrSegments. */
export function segments(
  time: readonly number[],
  values: readonly (number | null)[],
  { sampleGapS = 3, maxGapS = 30, fill }: SegmentOptions,
): number[][] {
  const out: number[][] = [];
  let current: number[] = [];
  let lastT = Number.NaN;

  for (let i = 0; i < time.length; i++) {
    const t = time[i]!;
    const raw = values[i];
    const valid = typeof raw === 'number' && Number.isFinite(raw) && raw > 0;
    if (!valid && fill === 'hold') continue;
    const p = valid ? raw : 0;

    if (current.length === 0) {
      current.push(p);
      lastT = t;
      continue;
    }
    const dt = t - lastT;
    if (!(dt > 0)) continue; // Duplicate or out-of-order timestamp.
    lastT = t;

    if (dt === 1) {
      current.push(p);
    } else if (dt <= sampleGapS) {
      const prev = current[current.length - 1]!;
      for (let k = 1; k < dt; k++) current.push(prev + ((p - prev) * k) / dt);
      current.push(p);
    } else if (dt <= maxGapS) {
      const filler = fill === 'zero' ? 0 : current[current.length - 1]!;
      for (let k = 1; k < dt; k++) current.push(filler);
      current.push(p);
    } else {
      out.push(current);
      current = [p];
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** Total length of the segments in seconds (riding time, zero-filled seconds included). */
export function segmentsDuration(segments: readonly (readonly number[])[]): number {
  return segments.reduce((n, s) => n + s.length, 0);
}

const NP_WINDOW_S = 30;

/**
 * Normalized Power: 30 s trailing rolling average (each segment's first 29 values have
 * no full window and are skipped), raised to the 4th power, averaged, 4th root.
 * Null when no segment is at least 30 s long.
 */
export function normalizedPower(segments: readonly (readonly number[])[]): number | null {
  let sumFourth = 0;
  let count = 0;
  for (const seg of segments) {
    let windowSum = 0;
    for (let i = 0; i < seg.length; i++) {
      windowSum += seg[i]!;
      if (i >= NP_WINDOW_S) windowSum -= seg[i - NP_WINDOW_S]!;
      if (i >= NP_WINDOW_S - 1) {
        const avg = windowSum / NP_WINDOW_S;
        sumFourth += avg ** 4;
        count++;
      }
    }
  }
  return count > 0 ? (sumFourth / count) ** 0.25 : null;
}

/**
 * Best average power for each duration, within a single segment. Null where every
 * segment is shorter than the duration.
 */
export function meanMaxPower(
  segments: readonly (readonly number[])[],
  durations: readonly number[] = MEAN_MAX_DURATIONS_S,
): (number | null)[] {
  const best: (number | null)[] = durations.map(() => null);
  for (const seg of segments) {
    const prefix = new Float64Array(seg.length + 1);
    for (let i = 0; i < seg.length; i++) prefix[i + 1] = prefix[i]! + seg[i]!;
    durations.forEach((d, di) => {
      if (d > seg.length) return;
      let maxSum = -Infinity;
      for (let end = d; end <= seg.length; end++) {
        const s = prefix[end]! - prefix[end - d]!;
        if (s > maxSum) maxSum = s;
      }
      const avg = maxSum / d;
      if (best[di] === null || avg > best[di]!) best[di] = avg;
    });
  }
  return best;
}

/** IF = NP / FTP. */
export function intensityFactor(np: number, ftp: number): number {
  return np / ftp;
}

/** TSS = (duration_s × NP × IF) / (FTP × 3600) × 100. */
export function trainingStressScore(durationS: number, np: number, ftp: number): number {
  return ((durationS * np * intensityFactor(np, ftp)) / (ftp * 3600)) * 100;
}
