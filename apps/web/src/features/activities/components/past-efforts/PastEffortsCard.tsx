import { useMemo } from 'react';
import { useActivityWorkout } from '@/shared/api/repeats';
import { Card } from '@/shared/ui/Card';
import { MIN_EFFORTS_FOR_CHART } from '../../constants';
import {
  comparedOnText,
  effortRows,
  WORKOUT_CHART_PANELS,
  workoutChartPoints,
  workoutTitle,
} from '../../lib/pastEfforts';
import { EffortVerdictLine } from './EffortVerdictLine';
import { PastEffortsChart } from './PastEffortsChart';
import { PastEffortsTable } from './PastEffortsTable';
import { RepeatName } from './RepeatName';
import { WorkoutPlacement } from './WorkoutPlacement';

type PastEffortsCardProps = {
  activityId: string;
};

/**
 * The indoor workout this ride is a repeat of: how it compares with the earlier efforts, every
 * effort's power and heart rate, and fixes for a wrong match. Indoor rides with power only; other
 * rides render nothing.
 */
export const PastEffortsCard = ({ activityId }: PastEffortsCardProps) => {
  const { data: workout } = useActivityWorkout(activityId);
  const rows = useMemo(() => (workout ? effortRows(workout, activityId) : []), [workout, activityId]);
  const chartPoints = useMemo(() => workoutChartPoints(rows), [rows]);
  if (!workout) return null;

  const hasOtherEfforts = rows.length > 1;
  const change = rows.find((row) => row.isCurrent)?.effort.change ?? null;

  return (
    <Card title="Same workout" className="lg:col-span-3">
      <RepeatName groupId={workout.id} name={workout.name} title={workoutTitle(workout)} noun="workout" />

      {hasOtherEfforts ? (
        <>
          {change && <EffortVerdictLine change={change} />}
          {rows.length >= MIN_EFFORTS_FOR_CHART && (
            <PastEffortsChart
              panels={WORKOUT_CHART_PANELS}
              points={chartPoints}
              ariaLabel={`Power and heart rate on this workout by date, ${rows.length} efforts. The table below lists them.`}
            />
          )}
          <div className="mt-3">
            <PastEffortsTable rows={rows} activityId={activityId} />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {comparedOnText(workout)} Rides are matched by the shape of their power, so the same workout at a new FTP
            still counts.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-2">
          You have ridden this workout once. The next time you ride it, both efforts are compared here.
        </p>
      )}

      <WorkoutPlacement workout={workout} activityId={activityId} />
    </Card>
  );
};
