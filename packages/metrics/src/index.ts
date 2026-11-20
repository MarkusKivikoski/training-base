export * from './discipline.js';
export * from './weeklyVolume.js';
export * from './power.js';
export * from './combine.js';
export * from './hr.js';
export * from './load.js';
export * from './trends.js';
export * from './zones.js';
export * from './records.js';
export * from './calendar.js';
export * from './loadStatus.js';
export * from './loadTrend.js';
export * from './intervals.js';
export * from './climbs.js';
export * from './goals.js';
export * from './activityLoad.js';
export * from './powerProfile.js';
export * from './yearReview.js';
export * from './criticalPower.js';
export * from './decoupling.js';
export * from './rpeLoad.js';
export * from './ftpPerKg.js';
export * from './thresholdSuggestion.js';
export * from './ftpSuggestion.js';
export * from './workoutMatch.js';
export * from './effortChange.js';
export * from './routeMatch.js';
export * from './workoutType.js';

/** Power-to-weight ratio. Null when either input is missing. */
export function wattsPerKg(watts: number | null | undefined, kg: number | null | undefined): number | null {
  if (watts == null || kg == null || kg <= 0) return null;
  return watts / kg;
}
