import type { Activity, RideRoute, RideWorkout } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { matchedRides, rideLabel, similarRides } from '../lib/similarRides';

type SimilarRidesCardProps = {
  ride: Activity;
  rides: readonly Activity[];
  /** The indoor workout ride A belongs to, if any: its other rides are suggested first. */
  workout: RideWorkout | null;
  /** The repeated outdoor route ride A followed, if any: its other rides are suggested first. */
  route: RideRoute | null;
  onPick: (id: string) => void;
};

/**
 * Suggestions for ride B, as buttons: earlier rides of the same workout or route first, then
 * rides like ride A. A ride has a workout (indoors) or a route (outdoors), never both.
 */
export const SimilarRidesCard = ({ ride, rides, workout, route, onPick }: SimilarRidesCardProps) => {
  const matchedLabel = workout ? 'Same workout' : 'Same route';
  const matchedEfforts = workout?.efforts ?? route?.efforts ?? [];
  const matchedRideIds = matchedEfforts.map((effort) => effort.activityId);
  const matched = matchedRides(ride, rides, matchedRideIds);
  const suggestions = similarRides(ride, rides).filter((suggestion) => !matchedRideIds.includes(suggestion.id));
  const rule = ride.isIndoor ? 'indoor' : 'outdoor, distance within ±15%';
  const hasNothing = matched.length === 0 && suggestions.length === 0;

  return (
    <Card title="Similar rides" className="mb-4">
      {hasNothing && <p className="text-sm text-ink-3">No similar rides found. Choose ride B from the list above.</p>}
      {matched.length > 0 && (
        <>
          <p className="mb-2 text-xs font-medium text-ink-2">{matchedLabel}</p>
          <SuggestionButtons rides={matched} onPick={onPick} />
        </>
      )}
      {suggestions.length > 0 && (
        <>
          {matched.length > 0 && <p className="mb-2 mt-3 text-xs font-medium text-ink-2">Other similar rides</p>}
          <SuggestionButtons rides={suggestions} onPick={onPick} />
        </>
      )}
      <p className="mt-2 text-xs text-ink-3">Same type and {rule}, newest first.</p>
    </Card>
  );
};

const SuggestionButtons = ({ rides, onPick }: { rides: readonly Activity[]; onPick: (id: string) => void }) => (
  <ul className="flex flex-wrap gap-2">
    {rides.map((suggestion) => (
      <li key={suggestion.id}>
        <button
          type="button"
          onClick={() => onPick(suggestion.id)}
          className="rounded-lg border border-line px-3 py-1.5 text-left text-sm hover:bg-surface-0"
        >
          {rideLabel(suggestion)}
        </button>
      </li>
    ))}
  </ul>
);
