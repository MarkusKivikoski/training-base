import type { GoalProgress } from '@app/metrics';
import type { Goal } from '@/shared/api/client';
import { formatGoalAmount } from '../../lib/goalText';

type GoalProgressBarProps = {
  goal: Goal;
  progress: GoalProgress;
};

/** Progress toward the goal, with a marker where an even pace would be today. */
export const GoalProgressBar = ({ goal, progress }: GoalProgressBarProps) => {
  const donePercent = Math.min(100, progress.fraction * 100);
  const pacePercent = Math.min(100, (progress.expected / progress.target) * 100);
  const isAchieved = progress.state === 'achieved';

  return (
    <div
      className="relative mt-2 h-2.5 rounded-full bg-surface-0"
      role="img"
      aria-label={`${Math.round(progress.fraction * 100)}% of the goal; an even pace would be at ${Math.round(pacePercent)}% by today.`}
    >
      <div className="h-full rounded-full bg-series-1" style={{ width: `${donePercent}%` }} />
      {!isAchieved && (
        <div
          className="absolute -top-1 h-[18px] w-0.5 rounded bg-ink"
          style={{ left: `calc(${pacePercent}% - 1px)` }}
          title={`Even pace by today: ${formatGoalAmount(progress.expected, goal.metric)}`}
        />
      )}
    </div>
  );
};
