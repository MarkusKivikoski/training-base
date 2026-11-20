import { loadCoverage, lowZoneShare, rideTimeS, weekTotals, type LoadCoverage, type LowZoneShare } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import { formatDistance, formatHours, formatMonthLong, formatSport, formatTss } from '@/shared/lib/formatters';

/** One week inside a month summary: its Monday and its activities on days in that month. */
export type SummaryWeek = { monday: string; activities: readonly Activity[] };

type ZoneChannel = 'power' | 'hr';

const THRESHOLD_NAMES: Record<ZoneChannel, { name: string; unit: string }> = {
  power: { name: 'FTP', unit: 'W' },
  hr: { name: 'LTHR', unit: 'bpm' },
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const percentOf = ({ lowS, totalS }: LowZoneShare): number => Math.round((lowS / totalS) * 100);

const zoneSetsOf = (activities: readonly Activity[], channel: ZoneChannel) => {
  const sets: Array<NonNullable<Activity['zones'][ZoneChannel]>> = [];
  for (const activity of activities) {
    const set = activity.zones[channel];
    if (set) sets.push(set);
  }
  return sets;
};

const lowShareOf = (activities: readonly Activity[], channel: ZoneChannel): LowZoneShare | null =>
  lowZoneShare(zoneSetsOf(activities, channel).map((set) => set.seconds));

/**
 * "FTP 199 W" (or "FTP 190–199 W" when it changed), so the coach can check the zones. Notes when
 * the threshold was applied back to rides before it was set: zones are back-applied, TSS isn't.
 */
const thresholdLabel = (activities: readonly Activity[], channel: ZoneChannel): string => {
  const sets = zoneSetsOf(activities, channel);
  const { name, unit } = THRESHOLD_NAMES[channel];
  const thresholds = sets.map((set) => set.threshold);
  const lowest = Math.min(...thresholds);
  const highest = Math.max(...thresholds);
  const range = lowest === highest ? `${lowest}` : `${lowest}–${highest}`;
  const backApplied = sets.find((set) => set.backApplied);
  if (!backApplied) return `${name} ${range} ${unit}`;
  return `${name} ${range} ${unit}; the ${name} set ${backApplied.thresholdFrom} is applied back to earlier rides`;
};

const ridingLine = (activities: readonly Activity[], averageWeekS: number | null): string => {
  const totals = weekTotals(activities);
  const parts = [`Riding: ${formatHours(totals.movingS)} moving (${plural(totals.rides, 'ride')})`];
  if (totals.outdoorDistanceM > 0) parts.push(`Outdoor ${formatDistance(totals.outdoorDistanceM, 0)}`);
  if (averageWeekS !== null) parts.push(`Avg ${formatHours(averageWeekS)}/week`);
  return parts.join(' · ');
};

const longestRideLine = (activities: readonly Activity[]): string | null => {
  let longest: Activity | null = null;
  for (const activity of activities) {
    if (!activity.isCycling) continue;
    if (!longest || rideTimeS(activity) > rideTimeS(longest)) longest = activity;
  }
  if (!longest) return null;
  return `Longest ride: ${formatHours(rideTimeS(longest))} (${longest.date}, ${longest.name})`;
};

const powerCoverageLine = (coverage: LoadCoverage): string =>
  `Power data: ${coverage.poweredRides} of ${plural(coverage.rides, 'ride')} ` +
  `(${formatHours(coverage.poweredS)} of ${formatHours(coverage.rideS)})`;

/**
 * TSS by source, saying how many rides it covers. Rides with no TSS make a total look smaller
 * than the load was, so they're called out instead of counting as zero.
 */
const tssLine = (coverage: LoadCoverage): string => {
  const coveredRides = coverage.powerTssRides + coverage.hrTssRides;
  if (coveredRides === 0) return `TSS: n/a (no ride has power TSS or heart-rate TSS)`;

  const total = formatTss(coverage.powerTss + coverage.hrTss);
  const sources: string[] = [];
  if (coverage.powerTssRides > 0) {
    sources.push(`power ${formatTss(coverage.powerTss)} (${plural(coverage.powerTssRides, 'ride')})`);
  }
  if (coverage.hrTssRides > 0) {
    sources.push(`HR-based ${formatTss(coverage.hrTss)} (${plural(coverage.hrTssRides, 'ride')})`);
  }
  const line = `TSS ${total} from ${coveredRides} of ${plural(coverage.rides, 'ride')}: ${sources.join(' · ')}`;
  if (coverage.noLoadRides === 0) return line;
  return (
    `${line}. No TSS for ${plural(coverage.noLoadRides, 'ride')} ` +
    '(no FTP or LTHR in effect for them: FTP and LTHR are never applied to rides before they were set), so the real load was higher'
  );
};

const zoneLine = (activities: readonly Activity[], channel: ZoneChannel): string | null => {
  const share = lowShareOf(activities, channel);
  if (!share) return null;
  const label = channel === 'power' ? 'Power' : 'HR';
  return `- ${label}: ${percentOf(share)}% of ${formatHours(share.totalS)} (${thresholdLabel(activities, channel)})`;
};

const zoneLines = (activities: readonly Activity[]): string[] => {
  const lines = [zoneLine(activities, 'power'), zoneLine(activities, 'hr')].filter(
    (line): line is string => line !== null,
  );
  if (lines.length === 0) return [];
  // Zone time counts every second with data, moving time leaves out stops: the hours differ.
  return ['Time in Z1–Z2 (hours are time with that data, not moving time):', ...lines];
};

/** Each other sport on one line: "- Strength training: 3 sessions, 2.5 h". */
const otherActivityLines = (activities: readonly Activity[]): string[] => {
  const bySport = new Map<string, { count: number; seconds: number }>();
  for (const activity of activities) {
    if (activity.isCycling) continue;
    const entry = bySport.get(activity.sport) ?? { count: 0, seconds: 0 };
    entry.count++;
    entry.seconds += activity.durationS;
    bySport.set(activity.sport, entry);
  }
  if (bySport.size === 0) return [];

  const lines = ['Other activities (not in the riding totals):'];
  for (const [sport, { count, seconds }] of bySport) {
    lines.push(`- ${formatSport(sport)}: ${plural(count, 'session')}, ${formatHours(seconds)}`);
  }
  return lines;
};

/** Everything about a period's load; `averageWeekS` is shown for months only. */
const loadLines = (activities: readonly Activity[], averageWeekS: number | null): string[] => {
  if (activities.length === 0) return ['No activities.'];
  const coverage = loadCoverage(activities);
  if (coverage.rides === 0) return ['No rides.', ...otherActivityLines(activities)];

  const lines = [ridingLine(activities, averageWeekS)];
  const longest = longestRideLine(activities);
  if (longest) lines.push(longest);
  lines.push(
    powerCoverageLine(coverage),
    tssLine(coverage),
    ...zoneLines(activities),
    ...otherActivityLines(activities),
  );
  return lines;
};

/** A week's training load as Markdown for a coaching chat. */
export const weekSummaryText = (monday: string, sunday: string, activities: readonly Activity[]): string =>
  [`## Training load, week ${monday} to ${sunday}`, ...loadLines(activities, null)].join('\n');

/** One line per week: "- Week of 2026-11-02: 6.2 h · TSS 468 (all rides) · Z1–Z2 power 72%, HR 50%". */
const weekLine = ({ monday, activities }: SummaryWeek): string => {
  const coverage = loadCoverage(activities);
  if (coverage.rides === 0) return `- Week of ${monday}: no rides`;

  const coveredRides = coverage.powerTssRides + coverage.hrTssRides;
  const tss =
    coveredRides === 0
      ? 'TSS n/a'
      : `TSS ${formatTss(coverage.powerTss + coverage.hrTss)} (${coveredRides} of ${plural(coverage.rides, 'ride')})`;
  const parts = [formatHours(coverage.rideS), tss];

  const shares: string[] = [];
  const power = lowShareOf(activities, 'power');
  const hr = lowShareOf(activities, 'hr');
  if (power) shares.push(`power ${percentOf(power)}%`);
  if (hr) shares.push(`HR ${percentOf(hr)}%`);
  if (shares.length > 0) parts.push(`Z1–Z2 ${shares.join(', ')}`);
  return `- Week of ${monday}: ${parts.join(' · ')}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days of the month counted so far: all of a past month, up to today in the current one. */
const daysCounted = (month: string, today: string): number => {
  const first = Date.parse(`${month}-01T00:00:00Z`);
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const last = Date.UTC(year, monthNumber, 0);
  const end = today.startsWith(month) ? Date.parse(`${today}T00:00:00Z`) : last;
  return Math.round((end - first) / DAY_MS) + 1;
};

/** A month's training load, then each week's days in the month, as Markdown for a coaching chat. */
export const monthSummaryText = (month: string, weeks: readonly SummaryWeek[], today: string): string => {
  const monthActivities = weeks.flatMap((week) => week.activities);
  const weeksCounted = daysCounted(month, today) / 7;
  const averageWeekS = loadCoverage(monthActivities).rideS / weeksCounted;

  const lines = [`## Training load, ${month} (${formatMonthLong(month)})`, ...loadLines(monthActivities, averageWeekS)];
  if (weeks.length > 0) lines.push('By week (days in this month only):', ...weeks.map(weekLine));
  return lines.join('\n');
};
