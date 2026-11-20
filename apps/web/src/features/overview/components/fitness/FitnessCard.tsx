import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { formatDate } from '@/shared/lib/formatters';
import { useDailyLoad } from '@/shared/api/load';
import { usePlan } from '@/shared/api/plan';
import type { PlannedEvent } from '@/shared/api/client';
import { nextEvent, plannedLoad } from '@/shared/lib/plan';
import { DEFAULT_FITNESS_RANGE, FITNESS_RANGE_OPTIONS, type FitnessRange } from '../../constants';
import { projectedRowOn, sessionsBefore } from '../../lib/eventProjection';
import { buildFitnessRows, riddenRows, rowsInRange, type FitnessRow } from '../../lib/fitnessRows';
import { EventCountdown } from './EventCountdown';
import { FitnessChart } from './FitnessChart';
import { FitnessSummary } from './FitnessSummary';
import { ForecastSummary } from './ForecastSummary';
import { ZoneGuide } from './ZoneGuide';

const NO_EVENTS: PlannedEvent[] = [];

type FitnessCardProps = {
  today: string;
  /** First FTP and LTHR entry dates, where training load starts. */
  firstFtp: string | null;
  firstLthr: string | null;
};

/** Fitness, fatigue and form: today's values with their status, and the chart over a chosen range with any forecast. */
export const FitnessCard = ({ today, firstFtp, firstLthr }: FitnessCardProps) => {
  const [range, setRange] = useState<FitnessRange>(DEFAULT_FITNESS_RANGE);
  const load = useDailyLoad();
  const plan = usePlan();
  const planned = useMemo(() => (plan.data ? plannedLoad(plan.data) : []), [plan.data]);
  const rows = useMemo(() => buildFitnessRows(load.data?.days ?? [], planned, today), [load.data, planned, today]);

  const events = plan.data?.events ?? NO_EVENTS;
  const upcomingEvent = nextEvent(events, today);
  const upcoming = useMemo((): UpcomingEvent | null => {
    if (!upcomingEvent || !load.data) return null;
    const row = projectedRowOn(load.data.days, planned, today, upcomingEvent.date);
    if (!row) return null;
    return { event: upcomingEvent, row, plannedSessions: sessionsBefore(planned, today, upcomingEvent.date) };
  }, [upcomingEvent, load.data, planned, today]);

  return (
    <Card
      title="Fitness & form"
      className="sm:col-span-2 xl:col-span-4"
      action={<Toggle label="Fitness range" value={range} onChange={setRange} options={FITNESS_RANGE_OPTIONS} />}
    >
      <FitnessCardBody
        isPending={load.isPending}
        error={load.error}
        rows={rows}
        visibleRows={rowsInRange(rows, today, range)}
        todayDate={today}
        events={events}
        upcoming={upcoming}
        firstFtp={firstFtp}
        firstLthr={firstLthr}
      />
    </Card>
  );
};

type UpcomingEvent = { event: PlannedEvent; row: FitnessRow; plannedSessions: number };

type FitnessCardBodyProps = {
  isPending: boolean;
  error: unknown;
  rows: FitnessRow[];
  visibleRows: FitnessRow[];
  todayDate: string;
  events: readonly PlannedEvent[];
  upcoming: UpcomingEvent | null;
  firstFtp: string | null;
  firstLthr: string | null;
};

const FitnessCardBody = ({
  isPending,
  error,
  rows,
  visibleRows,
  todayDate,
  events,
  upcoming,
  firstFtp,
  firstLthr,
}: FitnessCardBodyProps) => {
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  const ridden = riddenRows(rows);
  const today = ridden.at(-1);
  if (!today) {
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        No training load yet. It starts on the first date with an FTP (for power TSS) or an LTHR (for heart-rate TSS).
      </p>
    );
  }

  const { status } = today;
  const isBuildingBaseline = status.form.baseline && status.baselineUntil !== null;
  const settingsStarts = [
    firstFtp && `FTP since ${formatDate(firstFtp)}`,
    firstLthr && `LTHR since ${formatDate(firstLthr)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <FitnessSummary today={today} weekAgo={ridden.at(-8)} />
      <FitnessChart rows={visibleRows} todayDate={todayDate} events={events} />
      <ForecastSummary rows={rows} />
      {upcoming && <EventCountdown {...upcoming} today={todayDate} />}
      {isBuildingBaseline && (
        <p className="mt-2 text-xs text-ink-3">
          Zones appear once there are 6 weeks of load data (from {formatDate(status.baselineUntil!)}). Until then
          fitness is still catching up from zero, so ratios would be misleading.
        </p>
      )}
      <p className="mt-3 text-xs text-ink-3">
        Rides with power use power TSS; rides without power use heart-rate TSS. Strength training isn’t counted.
        {settingsStarts && ` Load starts at your first settings (${settingsStarts}).`}
      </p>
      <ZoneGuide />
    </>
  );
};
