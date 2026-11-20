import type { WorkoutEffort } from '@/shared/api/client';
import { effortVerdict } from '../../lib/pastEfforts';

type EffortVerdictLineProps = {
  change: NonNullable<WorkoutEffort['change']>;
};

/** How this ride compares with the earlier efforts on the workout: a headline and the numbers behind it. */
export const EffortVerdictLine = ({ change }: EffortVerdictLineProps) => {
  const verdict = effortVerdict(change);

  return (
    <p className="mt-2 text-sm">
      <span className="font-semibold">{verdict.headline}.</span> <span className="text-ink-2">{verdict.detail}</span>
    </p>
  );
};
