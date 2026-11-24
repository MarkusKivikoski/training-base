import { disciplineOf, type TimeRange } from '@app/metrics';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useActivity, useActivityStreams } from '@/shared/api/activities';
import { useSettings } from '@/shared/api/settings';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { useActivityClimbs, useGarminCheck } from './api';
import { ActivityClimbsCard } from './components/detail/ActivityClimbsCard';
import { ActivityRecordsCard } from './components/detail/ActivityRecordsCard';
import { DeletedInGarminNote } from './components/detail/DeletedInGarminNote';
import { FeelCard } from './components/detail/FeelCard';
import { PowerCard } from './components/detail/PowerCard';
import { RideHeader } from './components/detail/RideHeader';
import { SummaryCard } from './components/detail/SummaryCard';
import { TrainingLoadCard } from './components/detail/TrainingLoadCard';
import { IntervalsCard } from './components/intervals/IntervalsCard';
import { MergedRideNote } from './components/merge/MergedRideNote';
import { MergeRidePanel } from './components/merge/MergeRidePanel';
import { PastEffortsCard } from './components/past-efforts/PastEffortsCard';
import { RouteEffortsCard } from './components/past-efforts/RouteEffortsCard';
import { RideDataCard } from './components/ride-charts/RideDataCard';
import { RouteCard } from './components/route-map/RouteCard';
import { ZonesCard } from './components/zones/ZonesCard';
import { useIntervalEditor } from './hooks/useIntervalEditor';
import { recordingGapDurations, recordingGapRanges } from './lib/recordingGaps';
import { climbRanges, intervalFtp } from './lib/rideIntervals';

const route = getRouteApi('/activities/$activityId');

const NO_GAPS: readonly TimeRange[] = [];

/**
 * One activity: summary, power or load, how it felt, records, zones, intervals, past efforts on the
 * same workout or route, climbs, route map and ride charts.
 */
export const ActivityDetailPage = () => {
  const { activityId } = route.useParams();
  const { data: activity, error, isPending } = useActivity(activityId);
  const streams = useActivityStreams(activityId, { enabled: Boolean(activity) });
  const settings = useSettings();
  const garminCheck = useGarminCheck();
  const rideClimbs = useActivityClimbs(activityId);

  // Chart <-> map sync: seconds into the ride hovered on the charts, and on the map.
  const [chartTime, setChartTime] = useState<number | null>(null);
  const [mapTime, setMapTime] = useState<number | null>(null);

  const ftp = activity ? intervalFtp(activity) : null;
  const intervalEditor = useIntervalEditor(activityId, streams.data, ftp);
  const climbs = useMemo(() => climbRanges(rideClimbs.data ?? []), [rideClimbs.data]);
  const mergedFrom = activity?.mergedFrom ?? null;
  const streamGaps = useMemo(
    () => (streams.data && mergedFrom ? recordingGapRanges(streams.data.time, mergedFrom) : null),
    [streams.data, mergedFrom],
  );
  const gapsS = useMemo(
    () => (mergedFrom ? recordingGapDurations(mergedFrom, streamGaps) : []),
    [mergedFrom, streamGaps],
  );

  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  const isMissingInGarmin = garminCheck.data?.missing.some((missing) => missing.id === activityId) ?? false;
  const firstFtp = settings.data?.ftpHistory[0]?.from ?? null;
  const firstLthr = settings.data?.lthrHistory[0]?.from ?? null;
  const discipline = disciplineOf(activity);
  const gpsStream = !activity.isIndoor && streams.data?.lat ? streams.data : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/activities" className="text-sm text-ink-2 hover:text-ink">
        ← Activities
      </Link>
      {isMissingInGarmin && <DeletedInGarminNote checkedAt={garminCheck.data?.checkedAt} />}
      <RideHeader activity={activity} />
      {/* Hidden when empty, so rides with nothing to merge keep the usual spacing. */}
      <div className="mb-4 space-y-3 empty:hidden">
        {activity.mergedFrom && (
          <MergedRideNote activityId={activity.id} recordingCount={activity.mergedFrom.length} gapsS={gapsS} />
        )}
        {/* Keyed on the recordings, so a finished merge or split clears the panel's "Merging" note. */}
        {activity.isCycling && (
          <MergeRidePanel key={`${activity.id}-${activity.mergedFrom?.length ?? 1}`} activityId={activity.id} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard activity={activity} />
        {activity.hasPower ? (
          <PowerCard activity={activity} firstFtp={firstFtp} />
        ) : (
          <TrainingLoadCard activity={activity} firstLthr={firstLthr} />
        )}
        <FeelCard key={activity.id} activity={activity} />
        {discipline && <ActivityRecordsCard activityId={activity.id} discipline={discipline} />}
        <ZonesCard activity={activity} />
        {streams.data && intervalEditor.isLoaded && (
          <IntervalsCard stream={streams.data} editor={intervalEditor} ftp={ftp} isIndoor={activity.isIndoor} />
        )}
        {activity.isIndoor && activity.hasPower && <PastEffortsCard activityId={activity.id} />}
        {activity.isCycling && !activity.isIndoor && <RouteEffortsCard activityId={activity.id} />}
        {!activity.isIndoor && <ActivityClimbsCard activityId={activity.id} />}
        {gpsStream && <RouteCard stream={gpsStream} markerTime={mapTime ?? chartTime} onHoverTime={setMapTime} />}
        {/* Keyed on the ride, so the chart's remembered zoom starts fresh on another one. */}
        <RideDataCard
          key={activity.id}
          stream={streams.data}
          isPending={streams.isPending}
          hasError={Boolean(streams.error)}
          showPower={activity.hasPower}
          onHoverTime={setChartTime}
          highlightTime={mapTime}
          intervals={intervalEditor.intervals}
          climbs={climbs}
          recordingGaps={streamGaps ?? NO_GAPS}
          draftInterval={intervalEditor.chartMark}
          onPickTime={intervalEditor.pickTime}
        />
      </div>
    </div>
  );
};
