import type { Discipline } from './discipline';
import { formatPace, formatSpeed } from './formatters';

type RecordRules = {
  /** Average speed as shown for the sport: km/h for rides, pace for runs. */
  formatAverage: (mps: number) => string;
  /** Shortest activity (km) that counts for the fastest average. */
  averageMinKm: number;
  /** Shortest activity (km) that counts as the hilliest. */
  hilliestMinKm: number;
  /** Faster distance jumps than this are GPS glitches. */
  glitchLimit: string;
};

/**
 * What differs between ride and run records in the UI (Records page, an activity's records).
 * The limits match the records build in the ingest package.
 */
export const RECORD_RULES: Record<Discipline, RecordRules> = {
  cycling: { formatAverage: formatSpeed, averageMinKm: 20, hilliestMinKm: 10, glitchLimit: '90 km/h' },
  running: { formatAverage: formatPace, averageMinKm: 5, hilliestMinKm: 5, glitchLimit: '36 km/h' },
};
