import { normalizedPower } from './power.js';

/**
 * Resamples a sparse stream channel to one value per second from 0 to the last time. Gaps up to
 * `bridgeS` hold `fill` (0 for power, the last value otherwise); longer gaps (pauses) and missing
 * values stay NaN.
 */
export function perSecond(
  time: readonly number[],
  values: readonly (number | null)[],
  { fill = 'zero', bridgeS = 30 }: { fill?: 'zero' | 'hold'; bridgeS?: number } = {},
): number[] {
  const end = time.at(-1) ?? -1;
  const out = new Array<number>(end + 1).fill(Number.NaN);
  for (let i = 0; i < time.length; i++) {
    const v = values[i];
    const t = time[i]!;
    if (v === null || v === undefined) continue;
    out[t] = v;
    const next = time[i + 1];
    if (next !== undefined && next - t > 1 && next - t <= bridgeS) {
      for (let k = t + 1; k < next; k++) out[k] = fill === 'zero' ? 0 : v;
    }
  }
  return out;
}

export interface IntervalOptions {
  /** Work threshold as a fraction of FTP (default 0.88: sweet spot and harder). */
  threshold?: number;
  /** Smoothing window, seconds (centred). */
  windowS?: number;
  /** Dips shorter than this inside an effort don't split it. */
  mergeGapS?: number;
  /** Efforts shorter than this are ignored. */
  minDurationS?: number;
}

/** Longest dip that may still be joined when the joined effort averages above the threshold. */
const MAX_SAG_S = 60;

export interface TimeRange {
  /** Seconds since the start of the ride; `endS` is exclusive. */
  startS: number;
  endS: number;
}

/**
 * Work intervals from a power stream: where the centred rolling average reaches `threshold` ×
 * FTP, merging efforts separated by short dips and dropping very short ones. Pauses (gaps over
 * 30 s) end an interval. Returns time ranges, oldest first.
 */
export function detectIntervals(
  time: readonly number[],
  power: readonly (number | null)[],
  ftp: number,
  { threshold = 0.88, windowS = 30, mergeGapS = 20, minDurationS = 30 }: IntervalOptions = {},
): TimeRange[] {
  const p = perSecond(time, power, { fill: 'zero' });
  const half = Math.floor(windowS / 2);
  const limit = threshold * ftp;
  // Centred rolling mean over valid seconds (NaN where the window is mostly a pause).
  const work = p.map((_, t) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, t - half); k <= Math.min(p.length - 1, t + half); k++) {
      if (!Number.isNaN(p[k]!)) {
        sum += p[k]!;
        n++;
      }
    }
    return !Number.isNaN(p[t]!) && n >= half && sum / n >= limit;
  });

  const runs: TimeRange[] = [];
  for (let t = 0; t < work.length; t++) {
    if (!work[t]) continue;
    const start = t;
    while (t < work.length && work[t]) t++;
    runs.push({ startS: start, endS: t });
  }
  // Average power over [a, b), counting only recorded seconds.
  const avgOver = (a: number, b: number) => {
    let sum = 0;
    let n = 0;
    for (let k = a; k < b; k++) {
      if (!Number.isNaN(p[k]!)) {
        sum += p[k]!;
        n++;
      }
    }
    return n ? sum / n : 0;
  };
  const merged: TimeRange[] = [];
  for (const r of runs) {
    const last = merged.at(-1);
    const gap = last ? r.startS - last.endS : Infinity;
    const gapHasPause = last ? p.slice(last.endS, r.startS).some(Number.isNaN) : true;
    // Join across short dips, or across longer dips (≤ 60 s) when the joined stretch still
    // averages above the threshold, so a steady effort hovering at the limit stays one interval.
    const join =
      last && !gapHasPause && (gap < mergeGapS || (gap <= MAX_SAG_S && avgOver(last.startS, r.endS) >= limit));
    if (join) last.endS = r.endS;
    else merged.push({ ...r });
  }
  // Smoothing widens efforts by up to half a window; trim the edges back to where raw power
  // meets the threshold, so a 15 s sprint doesn't become a 30 s "interval".
  for (const r of merged) {
    while (r.startS < r.endS && !(p[r.startS]! >= limit)) r.startS++;
    while (r.endS > r.startS && !(p[r.endS - 1]! >= limit)) r.endS--;
  }
  return merged.filter((r) => r.endS - r.startS >= minDurationS);
}

export interface RangeStats {
  durationS: number;
  distanceM: number | null;
  avgPower: number | null;
  maxPower: number | null;
  np: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  /** m/s, distance ÷ duration. */
  avgSpeed: number | null;
}

export interface StreamLike {
  time: readonly number[];
  power: readonly (number | null)[] | null;
  hr: readonly (number | null)[] | null;
  cadence: readonly (number | null)[] | null;
  distance: readonly (number | null)[] | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const max = (xs: number[]) => (xs.length ? Math.max(...xs) : null);

/** Summary of one part of a ride (an interval or a lap), from its stream. */
export function rangeStats(s: StreamLike, { startS, endS }: TimeRange): RangeStats {
  const slice = (values: readonly (number | null)[] | null, fill: 'zero' | 'hold') =>
    values
      ? perSecond(s.time, values, { fill })
          .slice(startS, endS)
          .filter((v) => !Number.isNaN(v))
      : [];
  const power = slice(s.power, 'zero');
  const hr = slice(s.hr, 'hold');
  const cadence = slice(s.cadence, 'hold').filter((v) => v > 0); // coasting doesn't lower cadence
  const dist = s.distance ? perSecond(s.time, s.distance, { fill: 'hold' }) : null;
  const d0 = dist?.slice(startS, endS).find((v) => !Number.isNaN(v));
  const d1 = dist
    ?.slice(startS, endS)
    .reverse()
    .find((v) => !Number.isNaN(v));
  const distanceM = d0 !== undefined && d1 !== undefined ? Math.max(0, d1 - d0) : null;
  const durationS = endS - startS;
  return {
    durationS,
    distanceM,
    avgPower: power.some((v) => v > 0) ? mean(power) : null,
    maxPower: power.some((v) => v > 0) ? max(power) : null,
    np: power.length >= 30 && power.some((v) => v > 0) ? normalizedPower([power]) : null,
    avgHr: mean(hr),
    maxHr: max(hr),
    avgCadence: mean(cadence),
    avgSpeed: distanceM !== null && durationS > 0 ? distanceM / durationS : null,
  };
}
