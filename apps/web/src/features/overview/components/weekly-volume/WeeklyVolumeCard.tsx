import type { WeekVolume } from '@app/metrics';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { DataTable } from '@/shared/ui/DataTable';
import { EChart, type ChartClick } from '@/shared/charts/EChart';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { Card } from '@/shared/ui/Card';
import { Toggle } from '@/shared/ui/Toggle';
import { formatDate, formatDistance, formatHours } from '@/shared/lib/formatters';
import { CHART_VIEW_OPTIONS, type ChartView } from '../../constants';
import { weekMonth } from '../../lib/weekMonth';
import { buildWeeklyVolumeChartOption } from './weeklyVolumeChartOption';

type WeeklyVolumeCardProps = {
  weeks: WeekVolume[];
};

/** Weekly riding hours, indoor and outdoor, with a table view. */
export const WeeklyVolumeCard = ({ weeks }: WeeklyVolumeCardProps) => {
  const scheme = useColorScheme();
  const navigate = useNavigate();
  const [view, setView] = useState<ChartView>('chart');
  // `scheme` re-reads the colour tokens when the theme changes.
  const option = useMemo(() => buildWeeklyVolumeChartOption(weeks), [weeks, scheme]);

  const openWeekInCalendar = ({ dataIndex }: ChartClick) => {
    const week = weeks[dataIndex];
    if (!week) return;
    void navigate({ to: '/calendar', search: { month: weekMonth(week.weekStart), week: week.weekStart } });
  };

  let totalS = 0;
  for (const week of weeks) totalS += week.indoorDurationS + week.outdoorDurationS;

  return (
    <Card title="Weekly volume" className="sm:col-span-2 xl:col-span-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3">
          Moving time per week · {formatHours(totalS)} over {weeks.length} weeks
        </p>
        <Toggle label="Weekly volume view" value={view} onChange={setView} options={CHART_VIEW_OPTIONS} />
      </div>
      {view === 'chart' && (
        <EChart
          option={option}
          onClick={openWeekInCalendar}
          ariaLabel={`Weekly riding hours for the last ${weeks.length} weeks, indoor and outdoor. Click a week to open it in the calendar. Switch to the table view for exact values.`}
        />
      )}
      {view === 'table' && (
        <DataTable
          maxHeight="max-h-72"
          rows={[...weeks].reverse()}
          rowKey={(week) => week.weekStart}
          columns={[
            { key: 'week', header: 'Week of', cell: (week) => formatDate(week.weekStart) },
            { key: 'indoor', header: 'Indoor', align: 'right', cell: (week) => formatHours(week.indoorDurationS) },
            { key: 'outdoor', header: 'Outdoor', align: 'right', cell: (week) => formatHours(week.outdoorDurationS) },
            { key: 'rides', header: 'Rides', align: 'right', cell: (week) => week.count },
            {
              key: 'distance',
              header: 'Outdoor distance',
              align: 'right',
              cell: (week) => formatDistance(week.distanceM, 0),
            },
          ]}
        />
      )}
    </Card>
  );
};
