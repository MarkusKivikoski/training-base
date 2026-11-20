import { weeklyLoadTrend, weeklyTss, WEEK_LOAD_ZONES, type WeekTssRow, type WeeklyLoadTrend } from '@app/metrics';
import { useMemo, useState } from 'react';
import { DataTable } from '@/shared/ui/DataTable';
import { EChart } from '@/shared/charts/EChart';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { formatDate, formatTss } from '@/shared/lib/formatters';
import { useDailyLoad } from '@/shared/api/load';
import { CHART_VIEW_OPTIONS, WEEKS_SHOWN, type ChartView } from '../../constants';
import { zoneRangeInSymbols } from '../../lib/zoneText';
import { buildWeeklyLoadChartOption } from './weeklyLoadChartOption';
import { WeeklyLoadSummary } from './WeeklyLoadSummary';

type WeeklyLoadCardProps = {
  today: string;
};

const ZONE_LEGEND = WEEK_LOAD_ZONES.map((zone) => `${zone.label} ${zoneRangeInSymbols(zone)}×`).join(' · ');

/**
 * This week's training load against what you're used to: the last 7 days' TSS against the
 * average week of the 4 weeks before, with a status, and weekly TSS bars with that average as a
 * dashed line.
 */
export const WeeklyLoadCard = ({ today }: WeeklyLoadCardProps) => {
  const load = useDailyLoad();
  const [view, setView] = useState<ChartView>('chart');
  const days = useMemo(() => load.data?.days ?? [], [load.data]);
  const trend = useMemo(() => weeklyLoadTrend(days, today), [days, today]);
  const weeks = useMemo(() => weeklyTss(days, { today, weeks: WEEKS_SHOWN }), [days, today]);

  const renderBody = () => {
    if (load.isPending) return <Loading />;
    if (load.error) return <ErrorMessage error={load.error} />;
    if (days.length === 0) return <p className="py-6 text-center text-sm text-ink-3">No training load yet.</p>;
    return <WeeklyLoadContent trend={trend} weeks={weeks} view={view} />;
  };

  return (
    <Card
      title="Weekly load"
      className="sm:col-span-2 xl:col-span-4"
      action={<Toggle label="Weekly load view" value={view} onChange={setView} options={CHART_VIEW_OPTIONS} />}
    >
      {renderBody()}
    </Card>
  );
};

type WeeklyLoadContentProps = {
  trend: WeeklyLoadTrend;
  weeks: WeekTssRow[];
  view: ChartView;
};

const WeeklyLoadContent = ({ trend, weeks, view }: WeeklyLoadContentProps) => {
  const scheme = useColorScheme();
  // `scheme` re-reads the colour tokens when the theme changes.
  const option = useMemo(() => buildWeeklyLoadChartOption(weeks), [weeks, scheme]);
  const needsHistory = trend.status.baseline && trend.readyFrom !== null;

  return (
    <>
      <WeeklyLoadSummary trend={trend} />
      {view === 'chart' && (
        <EChart
          option={option}
          className="h-56"
          ariaLabel={`Weekly TSS for the last ${WEEKS_SHOWN} weeks, with the average of the 4 weeks before each as a dashed line. Switch to the table view for values.`}
        />
      )}
      {view === 'table' && (
        <DataTable
          maxHeight="max-h-56"
          rows={[...weeks].reverse()}
          rowKey={(week) => week.weekStart}
          columns={[
            { key: 'week', header: 'Week of', cell: (week) => formatDate(week.weekStart) },
            { key: 'tss', header: 'TSS', align: 'right', cell: (week) => formatTss(week.tss) },
            {
              key: 'usual',
              header: 'Usual week',
              align: 'right',
              cell: (week) => (week.usual === null ? null : formatTss(week.usual)),
            },
          ]}
        />
      )}
      <p className="mt-3 text-xs text-ink-3">
        Last 7 days&apos; TSS against the average week of the 4 weeks before (days 8–35 back). {ZONE_LEGEND}.
        {needsHistory && ` Needs 5 weeks of load history (from ${formatDate(trend.readyFrom!)}).`}
      </p>
    </>
  );
};
