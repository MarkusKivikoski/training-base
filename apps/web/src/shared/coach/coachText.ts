import { MEAN_MAX_DURATIONS_S } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import {
  formatCadence,
  formatClock,
  formatDistance,
  formatDurationLabel,
  formatElevation,
  formatHeartRate,
  formatIntensityFactor,
  formatLoad,
  formatPower,
  formatSpeed,
  formatSport,
  formatTss,
  formatWattsPerKg,
  formatWeight,
} from '@/shared/lib/formatters';
import type { RangeRow } from '@/shared/lib/rangeRows';
import { minuteLines, zoneLines, type CoachMinutes } from './coachDetail';

/** Mean-max durations worth a coach's attention; the full curve would be noise in a chat. */
const COACH_MEAN_MAX_S = [5, 60, 300, 1200, 3600] as const;

/** Training load going into the ride: yesterday's CTL and ATL, and the form they give. */
export type FormBefore = { ctl: number; atl: number; tsb: number };

/** Everything the coach text says about one ride. Missing parts are simply left out. */
export type CoachRide = {
  activity: Activity;
  /** Device laps with stats; empty for a single lap or no stream. */
  laps: readonly RangeRow[];
  rpe: number | null;
  note: string | null;
  weightKg: number | null;
  form: FormBefore | null;
  /** Per-minute power and HR; only for a single copied ride, to keep multi-ride text small. */
  minutes: CoachMinutes | null;
};

/** "label value" for each value that exists, joined with " · "; null when none exist. */
const statLine = (parts: ReadonlyArray<[label: string, value: string | null]>): string | null => {
  const present: string[] = [];
  for (const [label, value] of parts) {
    if (value !== null) present.push(label ? `${label} ${value}` : value);
  }
  return present.length > 0 ? present.join(' · ') : null;
};

const prefixed = (label: string, line: string | null): string | null => (line ? `${label}: ${line}` : null);

/** Formats a value only when it exists, so the line can drop it instead of showing a dash. */
const maybe = <T>(value: T | null | undefined, format: (value: T) => string): string | null =>
  value === null || value === undefined ? null : format(value);

const positive = (value: number | null | undefined): number | null =>
  value !== null && value !== undefined && value > 0 ? value : null;

const meanMaxLine = (meanMaxPower: Activity['meanMaxPower']): string | null => {
  if (!meanMaxPower) return null;
  const parts: Array<[string, string | null]> = [];
  for (const durationS of COACH_MEAN_MAX_S) {
    const watts = meanMaxPower[MEAN_MAX_DURATIONS_S.indexOf(durationS)];
    parts.push([formatDurationLabel(durationS), maybe(watts, formatPower)]);
  }
  const line = statLine(parts);
  return line ? `Best power: ${line}` : null;
};

const loadLine = (activity: Activity): string | null => {
  const metrics = activity.metrics;
  const hrTss = activity.load?.source === 'hr' ? activity.load.tss : null;
  const line = statLine([
    ['NP', maybe(metrics?.np, formatPower)],
    ['IF', maybe(metrics?.intensityFactor, formatIntensityFactor)],
    ['TSS', maybe(metrics?.tss, formatTss)],
    ['HR TSS', maybe(hrTss, formatTss)],
    ['FTP used', maybe(metrics?.ftpUsed, formatPower)],
  ]);
  return line ? `Load: ${line}` : null;
};

const wattsPerKgLine = (activity: Activity, weightKg: number | null): string | null => {
  const np = activity.metrics?.np;
  if (!weightKg || !np) return null;
  return `Weight ${formatWeight(weightKg)} · NP ${formatWattsPerKg(np / weightKg)}`;
};

const lapLine = (lap: RangeRow, index: number): string => {
  const stats = statLine([
    ['', formatClock(lap.durationS)],
    ['', maybe(positive(lap.distanceM), formatDistance)],
    ['avg', maybe(lap.avgPower, formatPower)],
    ['NP', maybe(lap.np, formatPower)],
    ['HR', maybe(lap.avgHr, formatHeartRate)],
    ['cad', maybe(lap.avgCadence, formatCadence)],
    ['', maybe(positive(lap.avgSpeed), formatSpeed)],
  ]);
  return `- Lap ${index + 1}: ${stats ?? ''}`;
};

/**
 * Says outright when a ride had no power meter, so the coach doesn't read missing power numbers
 * as an oversight or compare HR-based TSS with power TSS unawares. Other sports never have power.
 */
const noPowerLine = (activity: Activity): string | null => {
  if (!activity.isCycling || activity.hasPower) return null;
  const hasHrLoad = activity.load?.source === 'hr';
  return hasHrLoad ? 'No power meter, HR-based load' : 'No power meter, no load estimate (no HR-based TSS)';
};

/** One ride as compact Markdown for pasting into a coaching chat. */
export const coachRideText = ({ activity, laps, rpe, note, weightKg, form, minutes }: CoachRide): string => {
  const sportLabel = formatSport(activity.sport);
  // "Indoor cycling" already says so; an outdoor sport type without GPS doesn't.
  const needsIndoorTag = activity.isIndoor && !/indoor/i.test(sportLabel);
  const lines: Array<string | null> = [
    `## ${activity.startTimeLocal.slice(0, 10)} ${activity.startTimeLocal.slice(11, 16)} · ${activity.name}`,
    `Sport: ${sportLabel}${needsIndoorTag ? ' · Indoor' : ''}`,
    noPowerLine(activity),
    statLine([
      ['Duration', formatClock(activity.durationS)],
      ['Moving', maybe(activity.movingDurationS, formatClock)],
      ['Distance', maybe(positive(activity.distanceM), formatDistance)],
      ['Elevation', activity.isIndoor ? null : maybe(activity.elevationGainM, formatElevation)],
      ['Avg speed', maybe(positive(activity.avgSpeedMps), formatSpeed)],
    ]),
    prefixed(
      'Power',
      statLine([
        ['avg', maybe(activity.avgPower, formatPower)],
        ['max', maybe(activity.maxPower, formatPower)],
      ]),
    ),
    loadLine(activity),
    prefixed(
      'HR',
      statLine([
        ['avg', maybe(activity.avgHr, formatHeartRate)],
        ['max', maybe(activity.maxHr, formatHeartRate)],
      ]),
    ),
    prefixed('Cadence', statLine([['avg', maybe(activity.avgCadence, formatCadence)]])),
    meanMaxLine(activity.meanMaxPower),
    wattsPerKgLine(activity, weightKg),
    maybe(activity.decoupling, ({ percent, basis }) => `Aerobic decoupling (HR vs ${basis}): ${percent.toFixed(1)}%`),
    maybe(
      form,
      ({ ctl, atl, tsb }) =>
        `Form before ride: CTL ${formatLoad(ctl)} · ATL ${formatLoad(atl)} · TSB ${formatLoad(tsb, true)}`,
    ),
    maybe(rpe, (rating) => `Effort rating: ${rating}/10`),
    maybe(note, (text) => `Note: "${text}"`),
  ];

  lines.push(...zoneLines(activity.zones));

  if (laps.length > 0) {
    lines.push('Laps:');
    laps.forEach((lap, index) => lines.push(lapLine(lap, index)));
  }

  if (minutes) lines.push(...minuteLines(minutes));

  return lines.filter((line): line is string => line !== null).join('\n');
};

/** Load going into `date`: the previous day's CTL and ATL, and their difference (TSB). */
export const formBefore = (
  days: ReadonlyArray<{ date: string; ctl: number; atl: number }>,
  date: string,
): FormBefore | null => {
  let previous: { ctl: number; atl: number } | null = null;
  for (const day of days) {
    if (day.date >= date) break;
    previous = day;
  }
  if (!previous) return null;
  return { ctl: previous.ctl, atl: previous.atl, tsb: previous.ctl - previous.atl };
};

/** Several activities, oldest first so they read as a training log. */
export const coachRidesText = (rides: readonly CoachRide[]): string => {
  if (rides.length === 1 && rides[0]) return coachRideText(rides[0]);
  const oldestFirst = [...rides].sort((a, b) => a.activity.startTimeLocal.localeCompare(b.activity.startTimeLocal));
  const header = `# ${rides.length} activities`;
  return [header, ...oldestFirst.map(coachRideText)].join('\n\n');
};
