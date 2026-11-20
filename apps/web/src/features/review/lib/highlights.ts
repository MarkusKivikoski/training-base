import type { ClimbSummary, RecordsResponse, Trends } from '@/shared/api/client';
import { climbTitle } from '@/shared/lib/climbs';
import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import {
  formatClock,
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatHours,
  formatMonth,
  formatPower,
  formatRecordDistance,
} from '@/shared/lib/formatters';
import { RECORD_RULES } from '@/shared/lib/recordRules';
import { HIGHLIGHT_POWER_S, HIGHLIGHT_RUN_DISTANCES_M } from '../constants';

type RecordsScope = NonNullable<RecordsResponse['scope']>;
export type RecordEntry = RecordsScope['maxSpeed'][number];

/** The line under a highlight's value: plain text, or a link to a ride, an activity or a climb. */
export type HighlightDetail =
  | { kind: 'text'; text: string }
  /** Links to the record's ride when it has one. */
  | { kind: 'ride'; entry: RecordEntry; text: string }
  | { kind: 'activity'; activityId: string; text: string }
  | { kind: 'climb'; climbId: string; text: string; prefix?: string };

export type Highlight = { label: string; value: string; detail: HighlightDetail };

type HighlightInput = {
  scope: RecordsScope;
  /** The year's best 5 s heart rate, if there is one. */
  maxHr: Trends['maxHr'][number] | null;
  /** Climbs first found this year. */
  newClimbs: readonly ClimbSummary[];
  /** Whose year it is: the wording, and pace instead of speed for runs. */
  discipline: Discipline;
};

const rideDetail = (entry: RecordEntry, text = formatDate(entry.date)): HighlightDetail => ({
  kind: 'ride',
  entry,
  text,
});

/** The year's highlights, in display order; any without data are left out. */
export const yearHighlights = ({ scope, maxHr, newClimbs, discipline }: HighlightInput): Highlight[] => {
  const { one } = DISCIPLINE_WORDS[discipline];
  const { formatAverage, averageMinKm } = RECORD_RULES[discipline];
  const isRunning = discipline === 'running';
  const highlights: Highlight[] = [];
  const add = (label: string, value: string, detail: HighlightDetail) => highlights.push({ label, value, detail });

  const longestRide = scope.longestDistance[0];
  if (longestRide) {
    const text = `${formatDate(longestRide.date)} · ${longestRide.name ?? ''}`;
    add(`Longest ${one}`, formatDistance(longestRide.value, 1), rideDetail(longestRide, text));
  }

  const longestTime = scope.longestTime[0];
  if (longestTime) {
    const label = isRunning ? 'Longest time on a run' : 'Longest time in the saddle';
    add(label, formatDuration(longestTime.value), rideDetail(longestTime));
  }

  const mostClimbing = scope.highs.elevation[0];
  if (mostClimbing) add(`Most climbing in a ${one}`, formatElevation(mostClimbing.value), rideDetail(mostClimbing));

  const fastest = scope.highs.avgSpeed[0];
  if (fastest) add(`Fastest ${one} (${averageMinKm} km+)`, formatAverage(fastest.value), rideDetail(fastest));

  if (isRunning) {
    for (const distanceM of HIGHLIGHT_RUN_DISTANCES_M) {
      const best = scope.efforts.find((effort) => effort.distanceM === distanceM)?.top[0];
      if (best) add(`Fastest ${formatRecordDistance(distanceM)}`, formatClock(best.value), rideDetail(best));
    }
  }

  const biggestWeek = scope.periods.week.hours[0];
  if (biggestWeek) {
    const text = `Week of ${formatDate(biggestWeek.date)}`;
    add('Biggest week', formatHours(biggestWeek.value * 3600), { kind: 'text', text });
  }

  const biggestMonth = scope.periods.month.hours[0];
  if (biggestMonth) {
    const text = formatMonth(biggestMonth.date);
    add('Biggest month', formatHours(biggestMonth.value * 3600), { kind: 'text', text });
  }

  const streak = scope.streaks.days;
  if (streak) {
    const value = `${streak.length} ${streak.length === 1 ? 'day' : 'days'}`;
    add('Longest streak', value, { kind: 'text', text: `${formatDate(streak.from)} – ${formatDate(streak.to)}` });
  }

  const powerBest = scope.power.find((best) => best.durationS === HIGHLIGHT_POWER_S)?.top[0];
  if (powerBest) add('Best 20-minute power', formatPower(powerBest.value), rideDetail(powerBest));

  if (maxHr) {
    const text = `${formatDate(maxHr.date)} · ${maxHr.name}`;
    add('Max heart rate (5 s)', formatHeartRate(maxHr.bpm), { kind: 'activity', activityId: maxHr.id, text });
  }

  const biggestClimb = scope.climbs.biggestGain[0];
  if (biggestClimb?.id) {
    const text = `${formatDistance(biggestClimb.extra ?? 0, 2)} long`;
    add('Biggest climb ridden', formatElevation(biggestClimb.value), { kind: 'climb', climbId: biggestClimb.id, text });
  }

  const biggestNewClimb = [...newClimbs].sort((first, second) => second.gainM - first.gainM)[0];
  if (biggestNewClimb) {
    const detail: HighlightDetail = {
      kind: 'climb',
      climbId: biggestNewClimb.id,
      text: climbTitle(biggestNewClimb),
      prefix: 'Biggest: ',
    };
    add('New climbs', String(newClimbs.length), detail);
  }

  const firstRide = scope.firstRides[0];
  if (firstRide) {
    add(`First ${one} of the year`, formatDate(firstRide.date), rideDetail(firstRide, firstRide.name ?? ''));
  }

  const longestBreak = scope.breaks[0];
  if (longestBreak) {
    const text = `back on ${formatDate(longestBreak.date)}`;
    add('Longest break', `${longestBreak.value} days`, rideDetail(longestBreak, text));
  }

  return highlights;
};
