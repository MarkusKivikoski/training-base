import { GOAL_STATE_LOOK, type GoalProgress } from '@app/metrics';
import { useState } from 'react';
import type { Goal } from '@/shared/api/client';
import { describeGoalNeed, describeGoalPace, formatGoalAmount, goalLabel, goalPeriodInfo } from '../../lib/goalText';
import { StatusChip } from '../StatusChip';
import { GoalPaceChart } from './GoalPaceChart';
import { GoalProgressBar } from './GoalProgressBar';

type GoalRowProps = {
  goal: Goal;
  /** Null while the rides are loading. */
  progress: GoalProgress | null;
};

/** One goal: amount so far, a progress bar against even pace, its status and what's still needed. */
export const GoalRow = ({ goal, progress }: GoalRowProps) => {
  const [isChartOpen, setIsChartOpen] = useState(false);

  if (!progress) return <li className="py-3 text-sm text-ink-3">{goalLabel(goal)} · loading…</li>;

  const look = GOAL_STATE_LOOK[progress.state];
  const isAchieved = progress.state === 'achieved';
  const isLongPeriod = goal.period !== 'week';
  const status = {
    baseline: false as const,
    zone: { status: look.status, label: look.label, min: null, max: null },
    value: 0,
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-ink">
          {goalLabel(goal)} <span className="font-normal text-ink-3">· {goalPeriodInfo(goal.period).current}</span>
        </span>
        <span className="text-sm tabular-nums text-ink">
          <span className="font-semibold">{formatGoalAmount(progress.current, goal.metric)}</span>
          <span className="text-ink-3">
            {' '}
            / {formatGoalAmount(progress.target, goal.metric)} · {Math.round(progress.fraction * 100)}%
          </span>
        </span>
      </div>

      <GoalProgressBar goal={goal} progress={progress} />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <StatusChip
          status={status}
          baselineUntil={null}
          detail={isAchieved ? undefined : describeGoalPace(goal, progress)}
        />
        <span>{describeGoalNeed(goal, progress)}</span>
        {!isAchieved && isLongPeriod && (
          <span className="text-ink-3">At this rate: {formatGoalAmount(progress.projected, goal.metric)}</span>
        )}
        {isLongPeriod && (
          <button
            type="button"
            onClick={() => setIsChartOpen((open) => !open)}
            aria-expanded={isChartOpen}
            className="text-ink-2 hover:text-ink hover:underline sm:ml-auto"
          >
            {isChartOpen ? 'Hide pace chart' : 'Pace chart'}
          </button>
        )}
      </div>

      {isChartOpen && <GoalPaceChart goal={goal} progress={progress} />}
    </li>
  );
};
