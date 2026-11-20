import type { Activity } from '@/shared/api/client';
import { MAX_COACH_RIDES, useLoadCoachRides } from '@/shared/api/coach';
import { CopyButton } from '@/shared/ui/CopyButton';
import { coachRidesText } from './coachText';

type CopyForCoachButtonProps = {
  activities: readonly Activity[];
  /** Icon only, for table rows. */
  compact?: boolean;
  label?: string;
};

/** Copies the activities as Markdown for a coaching chat, loading laps, notes and load first. */
export const CopyForCoachButton = ({
  activities,
  compact = false,
  label = 'Copy for coach',
}: CopyForCoachButtonProps) => {
  const loadCoachRides = useLoadCoachRides();
  const isTooMany = activities.length > MAX_COACH_RIDES;

  return (
    <CopyButton
      getText={async () => coachRidesText(await loadCoachRides(activities))}
      label={label}
      dialogTitle="Copy for coach"
      compact={compact}
      title={isTooMany ? `Copies the first ${MAX_COACH_RIDES}` : 'Copy as text for a coaching chat'}
      disabled={activities.length === 0}
    />
  );
};
