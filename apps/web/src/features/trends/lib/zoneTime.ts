export type ZoneUnit = 'hours' | 'share';

export type IntensitySplit = { easy: number; moderate: number; hard: number; total: number };

/** Sum of seconds. */
export const totalSeconds = (seconds: readonly number[]): number => {
  let total = 0;
  for (const value of seconds) total += value;
  return total;
};

/** Easy / moderate / hard seconds over the given periods: Z1–2, Z3, Z4 and up. */
export const intensitySplit = (periods: ReadonlyArray<readonly number[]>): IntensitySplit => {
  let easy = 0;
  let moderate = 0;
  let hard = 0;
  for (const seconds of periods) {
    easy += (seconds[0] ?? 0) + (seconds[1] ?? 0);
    moderate += seconds[2] ?? 0;
    hard += totalSeconds(seconds.slice(3));
  }
  return { easy, moderate, hard, total: easy + moderate + hard };
};

/** Whole-percent share of the split's total. */
export const splitPercent = (split: IntensitySplit, seconds: number): number =>
  split.total > 0 ? Math.round((seconds / split.total) * 100) : 0;

/** Zone `index`'s bar value: hours with one decimal, or the percentage of the period with one decimal. */
export const zoneBarValue = (seconds: readonly number[], index: number, unit: ZoneUnit): number => {
  const inZone = seconds[index] ?? 0;
  if (unit === 'hours') return Math.round((inZone / 3600) * 10) / 10;
  const total = totalSeconds(seconds);
  return total > 0 ? Math.round((inZone / total) * 1000) / 10 : 0;
};
