import type { CurvePoint } from '@app/metrics';

/** Weight (kg) on a date, or null without a weight entry. */
export type KgForDate = (date: string) => number | null;

/** W/kg of a best effort, using the weight on that ride's date; null without weight. */
export const pointWattsPerKg = (point: CurvePoint, kgFor: KgForDate): number | null => {
  const kg = kgFor(point.date);
  return kg ? point.watts / kg : null;
};

/** The value plotted for a point: W/kg with two decimals, or whole watts. */
export const plottedValue = (point: CurvePoint, kgFor: KgForDate, perKg: boolean): number => {
  const wattsPerKg = pointWattsPerKg(point, kgFor);
  if (perKg && wattsPerKg !== null) return Math.round(wattsPerKg * 100) / 100;
  return Math.round(point.watts);
};

/** The curve's point at a duration, if it has one. */
export const pointAt = (curve: readonly CurvePoint[], durationS: number): CurvePoint | undefined =>
  curve.find((point) => point.durationS === durationS);
