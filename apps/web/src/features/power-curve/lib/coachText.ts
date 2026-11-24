import { MEAN_MAX_DURATIONS_S, powerProfile, RIDER_TYPES, type CriticalPower, type CurvePoint } from '@app/metrics';
import { formatDurationLabel, formatPower, formatVo2, formatWattsPerKg, formatWeight } from '@/shared/lib/formatters';
import type { ComparePreset, Preset } from '../constants';
import { durationsText, fitText, formatWPrime } from './criticalPowerText';
import { pointAt, pointWattsPerKg, type KgForDate } from './curveValues';
import { presetLabel, rangeFor } from './ranges';

/** The latest weekly VO₂ max estimate and the effort behind it. */
export type CoachVo2max = { date: string; vo2max: number; best5minW: number; kg: number };

/** Everything the Power Curve page shows, for a coaching chat. Missing parts are left out. */
export type PowerCurveCoach = {
  today: string;
  primary: Preset;
  compare: ComparePreset;
  primaryCurve: readonly CurvePoint[];
  compareCurve: readonly CurvePoint[];
  kgFor: KgForDate;
  /** Rides with power in the primary range. */
  rideCount: number | undefined;
  model: CriticalPower | null;
  ftp: number | null;
  kgToday: number | null;
  vo2max: CoachVo2max | null;
};

/** "Last 90 days, 2026-08-27 to 2026-11-24", or "All time, up to 2026-11-24". */
const rangeText = (preset: Preset, today: string): string => {
  const range = rangeFor(preset, today);
  const label = presetLabel(preset);
  if (!range.from) return `${label}, up to ${range.to}`;
  return `${label}, ${range.from} to ${range.to}`;
};

/** "290 W · 3.72 W/kg (2026-10-03, Hill repeats)": W/kg uses the weight on the ride's date. */
const effortText = (point: CurvePoint, kgFor: KgForDate): string => {
  const wattsPerKg = pointWattsPerKg(point, kgFor);
  const power =
    wattsPerKg === null ? formatPower(point.watts) : `${formatPower(point.watts)} · ${formatWattsPerKg(wattsPerKg)}`;
  const ride = point.name ? `${point.date}, ${point.name}` : point.date;
  return `${power} (${ride})`;
};

const contextLine = ({ rideCount, kgToday, ftp }: PowerCurveCoach): string | null => {
  const parts: string[] = [];
  if (rideCount !== undefined) parts.push(`${rideCount} ${rideCount === 1 ? 'ride' : 'rides'} with power in range`);
  if (kgToday) parts.push(`Weight today ${formatWeight(kgToday)}`);
  if (ftp) parts.push(`FTP setting ${formatPower(ftp)}`);
  return parts.length > 0 ? parts.join(' · ') : null;
};

/** One line per duration either range has an effort for, the comparison range's best beside it. */
const curveLines = ({ compare, primaryCurve, compareCurve, kgFor }: PowerCurveCoach): string[] => {
  const compareName = compare === 'none' ? null : presetLabel(compare);
  const besideText = compareName ? `, with ${compareName} beside it` : '';
  const lines = [`Best power by duration${besideText} (W/kg uses the weight on the ride's date):`];

  for (const durationS of MEAN_MAX_DURATIONS_S) {
    const best = pointAt(primaryCurve, durationS);
    const other = compareName ? pointAt(compareCurve, durationS) : undefined;
    if (!best && !other) continue;

    const bestText = best ? effortText(best, kgFor) : 'no effort';
    const line = `- ${formatDurationLabel(durationS)}: ${bestText}`;
    if (!compareName) {
      lines.push(line);
      continue;
    }
    const otherText = other ? effortText(other, kgFor) : 'no effort';
    lines.push(`${line} | ${compareName}: ${otherText}`);
  }
  return lines;
};

/** The rider type and each profile duration's W/kg, when the curve and weight allow a profile. */
const profileLines = ({ primaryCurve, kgFor }: PowerCurveCoach): string[] => {
  const profile = powerProfile(primaryCurve, kgFor);
  if (!profile) return [];

  const riderType = RIDER_TYPES[profile.type].label;
  const lines = [
    `Rider profile (Coggan's power profile, men's reference ranges; 0% = untrained, 100% = world class): ${riderType}`,
  ];
  for (const point of profile.points) {
    const label = point.key === 'threshold' ? 'FTP (95% of best 20 min)' : point.label;
    const scorePercent = Math.round(point.score * 100);
    lines.push(`- ${label}: ${formatWattsPerKg(point.wkg)} (${formatPower(point.watts)}), ${scorePercent}%`);
  }
  return lines;
};

const criticalPowerLine = ({ model, kgToday }: PowerCurveCoach): string | null => {
  if (!model) return null;
  const parts = [`CP ${formatPower(model.cp)}`];
  if (kgToday) parts.push(formatWattsPerKg(model.cp / kgToday));
  parts.push(`W′ ${formatWPrime(model.wPrimeJ)}`, `${fitText(model.rSquared)} (R² ${model.rSquared.toFixed(3)})`);
  const basis = `two-parameter model fitted to the ${durationsText(model.durationsS)} bests; an estimate, not a test`;
  return `Critical power (${basis}): ${parts.join(' · ')}`;
};

/** Always labelled the app's own estimate: Garmin's VO₂ max isn't available through its API. */
const vo2maxLine = ({ vo2max }: PowerCurveCoach): string | null => {
  if (!vo2max) return null;
  const basis =
    "this app's estimate, not Garmin's: ACSM cycling equation on the best 5-min power of the previous 90 days";
  const effort = `${formatPower(vo2max.best5minW)} at ${formatWeight(vo2max.kg)}`;
  return `VO₂ max (${basis}): ${formatVo2(vo2max.vo2max)} as of ${vo2max.date}, from ${effort}`;
};

/** The Power Curve page as compact Markdown for pasting into a coaching chat. */
export const powerCurveCoachText = (coach: PowerCurveCoach): string => {
  const compareLine = coach.compare === 'none' ? null : `Compared with: ${rangeText(coach.compare, coach.today)}`;
  const lines: Array<string | null> = [
    `## Power curve: ${rangeText(coach.primary, coach.today)}`,
    compareLine,
    contextLine(coach),
    ...curveLines(coach),
    ...profileLines(coach),
    criticalPowerLine(coach),
    vo2maxLine(coach),
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
};
