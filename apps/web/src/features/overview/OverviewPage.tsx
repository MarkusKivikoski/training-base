import { addDays, eftp, isoWeekStart, weeklyVolume } from '@app/metrics';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { useActivities, useMeanMax } from '@/shared/api/activities';
import { useSettings } from '@/shared/api/settings';
import { useStatus } from '@/shared/api/status';
import { AllActivitiesLoadCard } from './components/all-activities/AllActivitiesLoadCard';
import { FitnessCard } from './components/fitness/FitnessCard';
import { GearReminder } from './components/GearReminder';
import { GoalsCard } from './components/goals/GoalsCard';
import { RecentRidesCard } from './components/RecentRidesCard';
import { SummaryTiles } from './components/summary/SummaryTiles';
import { WeeklyLoadCard } from './components/weekly-load/WeeklyLoadCard';
import { WeeklyVolumeCard } from './components/weekly-volume/WeeklyVolumeCard';
import { WEEKS_SHOWN } from './constants';
import { summariseWeeks } from './lib/weekSummary';

/** Days of power data behind the eFTP estimate. */
const EFTP_WINDOW_DAYS = 90;

/** The dashboard: headline tiles, goals, fitness and form, weekly volume and load, and recent rides. */
export const OverviewPage = () => {
  const status = useStatus();
  const settings = useSettings();
  const today = status.data?.today;

  const firstWeekShown = today ? addDays(isoWeekStart(today), -7 * (WEEKS_SHOWN - 1)) : undefined;
  const rides = useActivities(
    { sport: 'cycling', from: firstWeekShown ?? '1970-01-01', limit: 1000 },
    { enabled: firstWeekShown !== undefined },
  );
  const recentPower = useMeanMax(today ? { from: addDays(today, -(EFTP_WINDOW_DAYS - 1)), to: today } : null);

  if (status.error) return <ErrorMessage error={status.error} />;
  if (!today || rides.isPending) return <Loading />;
  if (rides.error) return <ErrorMessage error={rides.error} />;

  const activities = rides.data.items;
  const weeks = weeklyVolume(activities, { endDate: today, weeks: WEEKS_SHOWN });

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Overview</h1>
      <GearReminder />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTiles
          week={summariseWeeks(weeks)}
          ftp={settings.data?.ftp ?? null}
          weightKg={settings.data?.weight?.kg ?? null}
          estimatedFtp={recentPower.data ? eftp(recentPower.data, today) : null}
          activityCount={status.data?.activityCount ?? 0}
          indexBuiltAt={status.data?.generatedAt ?? null}
        />
        <GoalsCard today={today} />
        <FitnessCard
          today={today}
          firstFtp={settings.data?.ftpHistory[0]?.from ?? null}
          firstLthr={settings.data?.lthrHistory[0]?.from ?? null}
        />
        <WeeklyVolumeCard weeks={weeks} />
        <WeeklyLoadCard today={today} />
        <AllActivitiesLoadCard today={today} />
        <RecentRidesCard rides={activities} />
      </div>
    </div>
  );
};
