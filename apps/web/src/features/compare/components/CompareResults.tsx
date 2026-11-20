import type { UseQueryResult } from '@tanstack/react-query';
import type { Activity } from '@/shared/api/client';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { OverlaidCard } from './OverlaidCard';
import { SideBySideCard } from './SideBySideCard';

type CompareResultsProps = {
  rideA: UseQueryResult<Activity>;
  rideB: UseQueryResult<Activity>;
  /** Whether both rides are chosen. */
  hasBothRides: boolean;
};

/** The comparison once both rides are chosen and loaded, or a hint, a spinner or the error. */
export const CompareResults = ({ rideA, rideB, hasBothRides }: CompareResultsProps) => {
  if (!hasBothRides) {
    return (
      <p className="text-sm text-ink-3">
        Choose two rides to compare. Tip: open a ride and use &quot;Compare…&quot; to start from it.
      </p>
    );
  }
  if (rideA.isPending || rideB.isPending) return <Loading />;
  if (rideA.error || rideB.error) return <ErrorMessage error={rideA.error ?? rideB.error} />;

  return (
    <div className="space-y-4">
      <SideBySideCard a={rideA.data} b={rideB.data} />
      <OverlaidCard a={rideA.data} b={rideB.data} />
    </div>
  );
};
