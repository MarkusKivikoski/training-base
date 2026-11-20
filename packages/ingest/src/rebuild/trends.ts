import {
  cumulativeByYear,
  efficiencyFactor,
  eftpSeries,
  maxHrByYear,
  monthlyVolume,
  vo2maxSeries,
  zonePeriods,
} from '@app/metrics';
import {
  TRENDS_SCHEMA_VERSION,
  weightOn,
  type ActivitySummary,
  type FtpEntry,
  type TrendsFile,
  type WeightEntry,
} from '@app/shared';

const round = (v: number | null, digits: number) => (v === null ? null : Math.round(v * 10 ** digits) / 10 ** digits);

/** The Trends file from all activity summaries: monthly volume, year-over-year hours and fitness markers. */
export function buildTrends(
  summaries: readonly ActivitySummary[],
  {
    ftpHistory,
    weightHistory,
    today,
    generatedAt,
  }: { ftpHistory: readonly FtpEntry[]; weightHistory: readonly WeightEntry[]; today: string; generatedAt: string },
): TrendsFile {
  const first = summaries.reduce<string | null>((min, a) => (min === null || a.date < min ? a.date : min), null);
  const months = first ? monthlyVolume(summaries, { from: first, to: today }) : [];

  const rides = summaries
    .filter((a) => a.metrics !== null)
    .map((a) => ({
      id: a.id,
      date: a.date,
      name: a.name,
      np: a.metrics!.np,
      avgHr: a.avgHr,
      ef: round(efficiencyFactor(a.metrics!.np, a.avgHr), 3),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const decoupling = summaries
    .filter((a) => a.decoupling !== null)
    .map((a) => ({ id: a.id, date: a.date, name: a.name, percent: a.decoupling!.percent, basis: a.decoupling!.basis }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const vo2max = vo2maxSeries(summaries, { to: today, kgOn: (date) => weightOn(weightHistory, date)?.kg ?? null }).map(
    (p) => ({
      ...p,
      vo2max: round(p.vo2max, 1)!,
      best5minW: Math.round(p.best5minW),
    }),
  );

  return {
    schemaVersion: TRENDS_SCHEMA_VERSION,
    generatedAt,
    today,
    months: months.map((m) => ({
      ...m,
      distanceM: Math.round(m.distanceM),
      elevationGainM: Math.round(m.elevationGainM),
    })),
    years: cumulativeByYear(summaries, { today }),
    ftp: { manual: [...ftpHistory], eftp: eftpSeries(summaries, { to: today }) },
    vo2max,
    zones: {
      weeks: zonePeriods(summaries, { by: 'week', to: today }),
      months: zonePeriods(summaries, { by: 'month', to: today }),
    },
    rides,
    decoupling,
    maxHr: maxHrByYear(summaries),
  };
}
