import { addDays, isoWeekStart, weeklyLoadByCategory } from '@app/metrics';
import { useMemo, useState } from 'react';
import { EChart } from '@/shared/charts/EChart';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import { formatDate, formatLoad } from '@/shared/lib/formatters';
import { useActivities } from '@/shared/api/activities';
import { useDailyLoad } from '@/shared/api/load';
import { useSettings } from '@/shared/api/settings';
import { CHART_VIEW_OPTIONS, WEEKS_SHOWN, type ChartView } from '../../constants';
import { countOtherSports, groupsWithLoad, lastSevenDaysTss, LOAD_CATEGORY_LOOK } from '../../lib/allActivitiesLoad';
import { buildCategoryLoadOption, buildFitnessComparisonOption } from './allActivitiesChartOptions';
import { AllActivitiesSummary } from './AllActivitiesSummary';
import { CategoryLoadTable } from './CategoryLoadTable';

type AllActivitiesLoadCardProps = {
  today: string;
};

/**
 * Training load from every activity type, kept apart from cycling fitness: weekly TSS stacked by
 * group (rides: their cycling load; other sports: heart-rate TSS at the cycling LTHR), and fitness
 * with and without the other sports. An indicator only.
 */
export const AllActivitiesLoadCard = ({ today }: AllActivitiesLoadCardProps) => {
  const scheme = useColorScheme();
  const [view, setView] = useState<ChartView>('chart');
  const from = addDays(isoWeekStart(today), -7 * (WEEKS_SHOWN - 1));
  const load = useDailyLoad({ from });
  const activities = useActivities({ sport: 'all', from, limit: 1000 });
  const settings = useSettings();

  const items = useMemo(() => activities.data?.items ?? [], [activities.data]);
  const weeks = useMemo(() => weeklyLoadByCategory(items, { endDate: today, weeks: WEEKS_SHOWN }), [items, today]);
  const groups = useMemo(() => groupsWithLoad(weeks), [weeks]);
  const cyclingDays = useMemo(() => load.data?.days ?? [], [load.data]);
  const allDays = useMemo(() => load.data?.allActivities ?? [], [load.data]);

  // `scheme` re-reads the colour tokens when the theme changes.
  const barOption = useMemo(() => buildCategoryLoadOption(weeks, groups), [weeks, groups, scheme]);
  const lineOption = useMemo(
    () => buildFitnessComparisonOption(cyclingDays, allDays, { from, to: today }),
    [cyclingDays, allDays, from, today, scheme],
  );

  const error = load.error ?? activities.error;
  const isLoading = load.isPending || activities.isPending;
  const firstLthr = settings.data?.lthrHistory[0]?.from ?? null;
  const cyclingCtl = cyclingDays.at(-1)?.ctl ?? null;
  const allActivitiesCtl = allDays.at(-1)?.ctl ?? null;

  const renderBody = () => {
    if (error) return <ErrorMessage error={error} />;
    if (isLoading) return <Loading />;
    return (
      <>
        <AllActivitiesSummary
          lastSevenDays={lastSevenDaysTss(items, today)}
          cyclingCtl={cyclingCtl}
          allActivitiesCtl={allActivitiesCtl}
          otherSports={countOtherSports(items)}
        />
        {view === 'chart' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EChart
              option={barOption}
              className="h-56"
              ariaLabel={`Weekly TSS by activity type, last ${WEEKS_SHOWN} weeks. The table view lists the values.`}
            />
            <EChart
              option={lineOption}
              className="h-56"
              ariaLabel={`Fitness (CTL) from cycling only and from all activities, last ${WEEKS_SHOWN} weeks: now ${formatLoad(cyclingCtl)} and ${formatLoad(allActivitiesCtl)}.`}
            />
          </div>
        )}
        {view === 'table' && <CategoryLoadTable weeks={weeks} />}
        <AllActivitiesNote firstLthr={firstLthr} groupLabels={groups.map((group) => LOAD_CATEGORY_LOOK[group].label)} />
      </>
    );
  };

  return (
    <Card
      title="All activities · load indicator"
      className="sm:col-span-2 xl:col-span-4"
      action={<Toggle label="All activities load view" value={view} onChange={setView} options={CHART_VIEW_OPTIONS} />}
    >
      {renderBody()}
    </Card>
  );
};

type AllActivitiesNoteProps = {
  firstLthr: string | null;
  groupLabels: string[];
};

const AllActivitiesNote = ({ firstLthr, groupLabels }: AllActivitiesNoteProps) => {
  const lthrNote = firstLthr
    ? ` Heart-rate load starts with your first LTHR on ${formatDate(firstLthr)}; it is never back-dated.`
    : ' Add an LTHR to get heart-rate load.';
  const groups = groupLabels.length > 0 ? groupLabels.join(', ') : 'none yet';
  const otherNote = groupLabels.includes('Other') ? ' (Other: walking, hiking, swimming, climbing, …)' : '';

  return (
    <p className="mt-3 text-xs text-ink-3">
      Rides count their cycling load; other sports count heart-rate TSS at your cycling LTHR, a rough indicator
      (strength and running heart rate don&apos;t map to training stress the way cycling does). Fitness, form and load
      statuses elsewhere use cycling only.{lthrNote} Groups: {groups}
      {otherNote}.
    </p>
  );
};
