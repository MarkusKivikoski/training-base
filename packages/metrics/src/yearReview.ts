import { loadCategory, type LoadCategory } from './activityLoad.js';
import { disciplineOf, type Discipline } from './discipline.js';
import { rideTimeS, type VolumeInput } from './weeklyVolume.js';

export interface ReviewInput extends VolumeInput {
  sport: string;
  isCycling: boolean;
  isRunning: boolean;
}

export interface YearTotals {
  /** Activities of the reviewed discipline: rides, or runs. */
  rides: number;
  indoorRides: number;
  outdoorRides: number;
  /** Moving time in the reviewed discipline, seconds. */
  movingS: number;
  distanceM: number;
  elevationM: number;
  /** Strength training sessions. */
  gym: number;
  /** Days with at least one activity of any type. */
  activeDays: number;
  /** Non-cycling activities per group (running, strength, skiing, other). */
  others: Record<Exclude<LoadCategory, 'cycling'>, number>;
}

export interface YearTotalsOptions {
  /**
   * "MM-DD": only activities up to that day of the year count, so a year in progress can be
   * compared with the same part of an earlier year.
   */
  untilMonthDay?: string | undefined;
  /** Whose rides, time, distance and elevation are summed. Cycling by default. */
  discipline?: Discipline;
}

/**
 * Totals for one calendar year from its activities: the volume of one discipline, plus gym
 * sessions, active days and the other-sports counts, which cover every activity type.
 */
export function yearTotals(
  activities: readonly ReviewInput[],
  year: number,
  { untilMonthDay, discipline = 'cycling' }: YearTotalsOptions = {},
): YearTotals {
  const t: YearTotals = {
    rides: 0,
    indoorRides: 0,
    outdoorRides: 0,
    movingS: 0,
    distanceM: 0,
    elevationM: 0,
    gym: 0,
    activeDays: 0,
    others: { running: 0, strength: 0, skiing: 0, other: 0 },
  };
  const days = new Set<string>();
  for (const a of activities) {
    if (!a.date.startsWith(`${year}-`)) continue;
    if (untilMonthDay && a.date.slice(5) > untilMonthDay) continue;
    days.add(a.date);
    if (a.sport === 'strength_training') t.gym++;
    if (!a.isCycling) {
      const c = loadCategory(a.sport, false) as Exclude<LoadCategory, 'cycling'>;
      t.others[c]++;
    }
    if (disciplineOf(a) !== discipline) continue;
    t.rides++;
    if (a.isIndoor) t.indoorRides++;
    else t.outdoorRides++;
    t.movingS += rideTimeS(a);
    t.distanceM += a.distanceM ?? 0;
    t.elevationM += a.isIndoor ? 0 : (a.elevationGainM ?? 0);
  }
  t.activeDays = days.size;
  return t;
}

/** Moving time per calendar month (index 0 = January) in one discipline, seconds. Cycling by default. */
export function monthlyRidingS(
  activities: readonly ReviewInput[],
  year: number,
  discipline: Discipline = 'cycling',
): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const a of activities) {
    if (disciplineOf(a) !== discipline || !a.date.startsWith(`${year}-`)) continue;
    months[Number(a.date.slice(5, 7)) - 1]! += rideTimeS(a);
  }
  return months;
}
