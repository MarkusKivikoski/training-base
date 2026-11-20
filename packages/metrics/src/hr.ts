import { segments, type PowerSegmentOptions } from './power.js';

/**
 * 1 Hz heart-rate segments. Same gap thresholds as power (interpolate ≤3 s, bridge ≤30 s,
 * pause beyond), but gaps hold the last value: heart rate doesn't drop to zero when a
 * record is missing. Records without heart rate are skipped.
 */
export function hrSegments(
  time: readonly number[],
  hr: readonly (number | null)[],
  options: PowerSegmentOptions = {},
): number[][] {
  return segments(time, hr, { ...options, fill: 'hold' });
}

/** Heart rate below this share of LTHR counts as no load (stops, soft-pedalling). */
export const HR_TSS_FLOOR = 0.5;

/**
 * Heart-rate TSS: Σ over seconds of (HR / LTHR)² × 100 / 3600, so one hour at LTHR is 100,
 * mirroring power TSS (IF² × hours × 100). Seconds below HR_TSS_FLOOR × LTHR count as 0.
 *
 * This is our own method, not a Garmin or TrainingPeaks constant. It is calibrated against
 * power TSS on rides that have both (`npm run check-metrics`).
 */
export function hrTss(hrSegs: readonly (readonly number[])[], lthr: number): number {
  let sum = 0;
  for (const seg of hrSegs) {
    for (const hr of seg) {
      const r = hr / lthr;
      if (r >= HR_TSS_FLOOR) sum += r * r;
    }
  }
  return (sum * 100) / 3600;
}

export interface LthrEstimate {
  /** 95% of the average heart rate during the best 20-minute power window. */
  lthr: number;
  avgHr: number;
  avgPower: number;
  /** Start of the window, in seconds from the ride start (time-axis units). */
  windowStartS: number;
}

const TEST_WINDOW_S = 1200;

/**
 * Estimates LTHR from a 20-minute FTP test: find the best 20-minute power window, average
 * heart rate over that same window, and take 95%. Uses the raw 1 Hz streams (time in
 * seconds); seconds without a record are not filled. Null if the ride has no 20-minute
 * stretch with both power and heart rate.
 */
export function estimateLthr(
  time: readonly number[],
  power: readonly (number | null)[],
  hr: readonly (number | null)[],
): LthrEstimate | null {
  // Index by second so windows are measured in real time, not record counts.
  const end = time.length ? time[time.length - 1]! : 0;
  const p = new Float64Array(end + 1);
  const h = new Float64Array(end + 1);
  const hasHr = new Uint8Array(end + 1);
  for (let i = 0; i < time.length; i++) {
    const t = time[i]!;
    const pv = power[i];
    const hv = hr[i];
    if (typeof pv === 'number' && pv > 0) p[t] = pv;
    if (typeof hv === 'number' && hv > 0) {
      h[t] = hv;
      hasHr[t] = 1;
    }
  }
  if (end + 1 < TEST_WINDOW_S) return null;

  const prefix = (arr: ArrayLike<number>) => {
    const out = new Float64Array(arr.length + 1);
    for (let i = 0; i < arr.length; i++) out[i + 1] = out[i]! + arr[i]!;
    return out;
  };
  const pp = prefix(p);
  const hp = prefix(h);
  const cp = prefix(hasHr);

  let bestStart = -1;
  let bestSum = -Infinity;
  for (let s = 0; s + TEST_WINDOW_S <= end + 1; s++) {
    const sum = pp[s + TEST_WINDOW_S]! - pp[s]!;
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = s;
    }
  }
  const hrCount = cp[bestStart + TEST_WINDOW_S]! - cp[bestStart]!;
  // Require heart rate for at least 90% of the window.
  if (bestStart < 0 || bestSum <= 0 || hrCount < TEST_WINDOW_S * 0.9) return null;

  const avgHr = (hp[bestStart + TEST_WINDOW_S]! - hp[bestStart]!) / hrCount;
  return { lthr: avgHr * 0.95, avgHr, avgPower: bestSum / TEST_WINDOW_S, windowStartS: bestStart };
}

/** Heart-rate readings outside this range are sensor errors, not heart rate. */
export const PLAUSIBLE_HR = { min: 30, max: 230 } as const;

/**
 * Highest average heart rate over `windowS` seconds (default 5), from 1 Hz segments with gaps
 * held (see hrSegments). Implausible readings are dropped first. With a chest strap the errors
 * are one- or two-second glitches, which 5 s averages away; a longer window would also average
 * in the climb to the peak and read several beats under a true max. Null without a long enough
 * stretch.
 */
export function peakHr(time: readonly number[], hr: readonly (number | null)[], windowS = 5): number | null {
  const clean = hr.map((v) => (v !== null && v >= PLAUSIBLE_HR.min && v <= PLAUSIBLE_HR.max ? v : null));
  let best: number | null = null;
  for (const seg of hrSegments(time, clean)) {
    if (seg.length < windowS) continue;
    let sum = 0;
    for (let i = 0; i < seg.length; i++) {
      sum += seg[i]!;
      if (i >= windowS) sum -= seg[i - windowS]!;
      if (i >= windowS - 1 && (best === null || sum / windowS > best)) best = sum / windowS;
    }
  }
  return best === null ? null : Math.round(best * 10) / 10;
}
