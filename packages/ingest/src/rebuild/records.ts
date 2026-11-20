import {
  disciplineOf,
  MEAN_MAX_DURATIONS_S,
  periodTotals,
  RECORD_INPUTS,
  rideTimeS,
  streaks,
  topN,
  type Discipline,
  type PeriodTotal,
} from '@app/metrics';
import {
  RECORDS_SCHEMA_VERSION,
  type ActivitySummary,
  type Climb,
  type DisciplineRecords,
  type RecordEntry,
  type RecordsFile,
  type RecordsScope,
} from '@app/shared';

/** Power-best durations shown on the Records view. */
const POWER_DURATIONS_S = [5, 60, 300, 1200, 3600] as const;

interface RecordRules {
  /** Highest average speed only counts activities at least this long (m), so short sprints don't win. */
  avgSpeedMinM: number;
  /** Hilliest activity only counts activities at least this long (m), so a short hill loop doesn't win. */
  hilliestMinM: number;
  /** Top speed, power bests and climb records are cycling records; runs leave them empty. */
  hasSpeedPowerAndClimbs: boolean;
}

/** What differs between the disciplines' records. The record distances are in RECORD_INPUTS. */
export const RECORD_RULES: Record<Discipline, RecordRules> = {
  cycling: { avgSpeedMinM: 20_000, hilliestMinM: 10_000, hasSpeedPowerAndClimbs: true },
  running: { avgSpeedMinM: 5_000, hilliestMinM: 5_000, hasSpeedPowerAndClimbs: false },
};

const NO_CLIMB_RECORDS: RecordsScope['climbs'] = { longest: [], biggestGain: [] };
/** Earliest start ignores rides starting before this (seconds after midnight): a ride just after midnight isn't "early". */
const EARLIEST_FROM_S = 4 * 3600;

/** Start time of day in seconds after local midnight. */
const startOfDayS = (a: ActivitySummary) => {
  const [h, m, s] = a.startTimeLocal.slice(11).split(':').map(Number) as [number, number, number];
  return h * 3600 + m * 60 + s;
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Every break between consecutive riding days: the ride that ended it and the full days without a ride. */
function rideBreaks(rides: readonly ActivitySummary[]): RecordEntry[] {
  const firstOfDay = new Map<string, ActivitySummary>();
  for (const a of rides) if (!firstOfDay.has(a.date)) firstOfDay.set(a.date, a);
  const days = [...firstOfDay.keys()].sort();
  const out: RecordEntry[] = [];
  for (let i = 1; i < days.length; i++) {
    const off = daysBetween(days[i - 1]!, days[i]!) - 1;
    if (off > 0) out.push(rideEntry(firstOfDay.get(days[i]!)!, off));
  }
  return out;
}

/** The first ride of each year, newest year first. */
function firstRides(rides: readonly ActivitySummary[]): RecordEntry[] {
  const first = new Map<string, ActivitySummary>();
  for (const a of rides) {
    const y = a.date.slice(0, 4);
    const f = first.get(y);
    if (!f || a.startTimeLocal < f.startTimeLocal) first.set(y, a);
  }
  return [...first.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => rideEntry(a, Math.round(a.distanceM ?? 0)));
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const rideEntry = (a: ActivitySummary, value: number, extra?: number): RecordEntry => ({
  id: a.id,
  name: a.name,
  date: a.date,
  value,
  ...(extra === undefined ? {} : { extra }),
});

/** Top 3 rides by `value` (or lowest first), as podium entries. */
function podium(
  rides: readonly ActivitySummary[],
  value: (a: ActivitySummary) => number | null,
  { lowest = false, extra }: { lowest?: boolean; extra?: (a: ActivitySummary, v: number) => number } = {},
): RecordEntry[] {
  return topN(rides, value, 3, lowest).map((x) => rideEntry(x, x.value, extra?.(x, x.value)));
}

/** Top 3 rides by best average power, per duration shown on the Records view. */
function powerBests(rides: readonly ActivitySummary[]): RecordsScope['power'] {
  return POWER_DURATIONS_S.map((durationS) => {
    const i = (MEAN_MAX_DURATIONS_S as readonly number[]).indexOf(durationS);
    return { durationS, top: podium(rides, (a) => a.meanMaxPower?.[i] ?? null) };
  });
}

function periodPodiums(totals: readonly PeriodTotal[]): RecordsScope['periods']['week'] {
  const top = (pick: (p: PeriodTotal) => number, round: (v: number) => number) =>
    topN(totals, pick).map((p) => ({ date: p.date, value: round(p.value) }));
  return {
    hours: top((p) => p.hours, r1),
    distanceKm: top((p) => p.distanceKm, r1),
    elevationM: top((p) => p.elevationM, Math.round),
    rides: top(
      (p) => p.rides,
      (v) => v,
    ),
  };
}

/**
 * Top 3 distinct climbs by length and by gain, among climbs with an effort in the scope (`inScope`
 * picks effort dates). Each hill counts once, dated by its last effort in the scope.
 */
function climbPodiums(climbs: readonly Climb[], inScope: (date: string) => boolean): RecordsScope['climbs'] {
  const ridden = climbs.flatMap((c) => {
    const dates = c.efforts.map((e) => e.date).filter(inScope);
    return dates.length ? [{ c, date: dates.reduce((a, b) => (b > a ? b : a)) }] : [];
  });
  const top = (value: (c: Climb) => number, extra: (c: Climb) => number) =>
    topN(ridden, (x) => value(x.c)).map((x) => ({
      id: x.c.id,
      date: x.date,
      value: Math.round(x.value),
      extra: Math.round(extra(x.c)),
    }));
  return {
    longest: top(
      (c) => c.lengthM,
      (c) => c.gainM,
    ),
    biggestGain: top(
      (c) => c.gainM,
      (c) => c.lengthM,
    ),
  };
}

interface ScopeInput {
  discipline: Discipline;
  today: string;
  allTime: boolean;
  climbs: RecordsScope['climbs'];
  breaks: readonly RecordEntry[];
}

/** One scope's records from the rides (or runs) of one discipline in that scope. */
function buildScope(
  rides: readonly ActivitySummary[],
  { discipline, today, allTime, climbs, breaks }: ScopeInput,
): RecordsScope {
  const rules = RECORD_RULES[discipline];
  const outdoor = rides.filter((a) => !a.isIndoor);
  const s = streaks(
    rides.map((a) => a.date),
    today,
  );

  return {
    efforts: RECORD_INPUTS[discipline].distancesM.map((distanceM, i) => ({
      distanceM,
      top: podium(outdoor, (a) => a.records?.distanceBestsS[i] ?? null, {
        lowest: true,
        extra: (_a, sec) => r3(distanceM / sec),
      }),
    })),
    maxSpeed: rules.hasSpeedPowerAndClimbs ? podium(outdoor, (a) => a.records?.maxSpeedMps ?? null) : [],
    longestDistance: podium(outdoor, (a) => (a.distanceM ? Math.round(a.distanceM) : null)),
    longestTime: podium(rides, (a) => Math.round(rideTimeS(a))),
    power: rules.hasSpeedPowerAndClimbs ? powerBests(rides) : [],
    periods: {
      week: periodPodiums(periodTotals(rides, 'week')),
      month: periodPodiums(periodTotals(rides, 'month')),
      year: allTime ? periodPodiums(periodTotals(rides, 'year')) : null,
    },
    highs: {
      elevation: podium(rides, (a) => (a.elevationGainM ? Math.round(a.elevationGainM) : null)),
      // From the stream: glitch-free distance over moving time (Garmin's moving time is sometimes far too low).
      avgSpeed: podium(outdoor, (a) => {
        const r = a.records;
        return r?.distanceM && r.movingS && r.distanceM >= rules.avgSpeedMinM ? r3(r.distanceM / r.movingS) : null;
      }),
      maxHr: podium(rides, (a) => a.maxHr),
      hilliest: podium(
        outdoor,
        (a) =>
          a.distanceM && a.distanceM >= rules.hilliestMinM && a.elevationGainM
            ? r1(a.elevationGainM / (a.distanceM / 1000))
            : null,
        {
          extra: (a) => Math.round(a.elevationGainM ?? 0),
        },
      ),
      earliestStart: podium(rides, (a) => (startOfDayS(a) >= EARLIEST_FROM_S ? startOfDayS(a) : null), {
        lowest: true,
      }),
    },
    climbs,
    breaks: topN(breaks, (b) => b.value).map(({ value, ...b }) => ({ ...b, value })),
    firstRides: firstRides(rides),
    streaks: {
      days: s.days,
      weeks: s.weeks,
      ...(allTime ? { currentDays: s.currentDays, currentWeeks: s.currentWeeks } : {}),
    },
  };
}

/** One discipline's records: all time and each year with an activity. Climb records are cycling's. */
function buildDisciplineRecords(
  sorted: readonly ActivitySummary[],
  discipline: Discipline,
  { today, climbs }: { today: string; climbs: readonly Climb[] },
): DisciplineRecords {
  const rides = sorted.filter((a) => disciplineOf(a) === discipline);
  const years = [...new Set(rides.map((a) => Number(a.date.slice(0, 4))))].sort((a, b) => b - a);
  const breaks = rideBreaks(rides);
  const hasClimbs = RECORD_RULES[discipline].hasSpeedPowerAndClimbs;
  const climbRecords = (inScope: (date: string) => boolean) =>
    hasClimbs ? climbPodiums(climbs, inScope) : NO_CLIMB_RECORDS;

  const scopes: DisciplineRecords['scopes'] = {
    all: buildScope(rides, { discipline, today, allTime: true, climbs: climbRecords(() => true), breaks }),
  };
  for (const year of years) {
    const inYear = (date: string) => date.startsWith(`${year}-`);
    scopes[String(year)] = buildScope(
      rides.filter((a) => inYear(a.date)),
      {
        discipline,
        today,
        allTime: false,
        climbs: climbRecords(inYear),
        breaks: breaks.filter((b) => inYear(b.date)),
      },
    );
  }
  return { years, scopes };
}

/**
 * Personal records per discipline, for all time and for each year with rides (or runs), including
 * climb records from `climbs` for cycling.
 */
export function buildRecords(
  summaries: readonly ActivitySummary[],
  { today, generatedAt, climbs = [] }: { today: string; generatedAt: string; climbs?: readonly Climb[] },
): RecordsFile {
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const disciplines: RecordsFile['disciplines'] = {
    cycling: buildDisciplineRecords(sorted, 'cycling', { today, climbs }),
    running: buildDisciplineRecords(sorted, 'running', { today, climbs }),
  };
  return { schemaVersion: RECORDS_SCHEMA_VERSION, generatedAt, today, disciplines };
}
