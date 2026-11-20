/**
 * Gaps longer than this are pauses and break the line. It matches the metrics' 30 s rule,
 * so smart-recording watches (records every few seconds) still draw continuous lines.
 */
export const PAUSE_S = 30;

/**
 * Pairs of [seconds, value] for one channel. Records missing this channel are skipped
 * (the line bridges them), and a null point is inserted only where the channel goes
 * quiet for longer than PAUSE_S, so lines break at real pauses.
 */
export const toChartPoints = (
  time: readonly number[],
  values: readonly (number | null)[],
  scale = 1,
): Array<[number, number | null]> => {
  const points: Array<[number, number | null]> = [];
  let lastTime: number | null = null;

  for (let i = 0; i < time.length; i++) {
    const value = values[i];
    if (value === null || value === undefined) continue;

    const t = time[i]!;
    const isAfterPause = lastTime !== null && t - lastTime > PAUSE_S;
    if (isAfterPause) points.push([lastTime! + 1, null]);
    points.push([t, value * scale]);
    lastTime = t;
  }
  return points;
};

/** Index of the last sample at or before `t` (binary search; `time` is ascending). */
export const indexAtTime = (time: readonly number[], t: number): number => {
  let low = 0;
  let high = time.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (time[middle]! <= t) low = middle;
    else high = middle - 1;
  }
  return low;
};
