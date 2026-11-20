import type { DayLoad } from '@/shared/api/client';
import { buildFitnessRows, type FitnessRow } from './fitnessRows';

/**
 * The fitness row on `date`: ridden if it's in the data, otherwise projected from the planned
 * sessions up to it, with unplanned days counting as rest. A zero-TSS point on `date` makes the
 * forecast reach it even when nothing is planned that late.
 */
export const projectedRowOn = (
  days: readonly DayLoad[],
  planned: ReadonlyArray<{ date: string; tss: number }>,
  today: string,
  date: string,
): FitnessRow | undefined =>
  buildFitnessRows(days, [...planned, { date, tss: 0 }], today).find((row) => row.date === date);

/** How many planned sessions fall between today and the event (inclusive of the event day). */
export const sessionsBefore = (
  planned: ReadonlyArray<{ date: string; tss: number }>,
  today: string,
  date: string,
): number => planned.filter((plan) => plan.date > today && plan.date <= date).length;
