import { getRouteApi } from '@tanstack/react-router';
import { useActivities, useActivity } from '@/shared/api/activities';
import { useActivityRoute, useActivityWorkout } from '@/shared/api/repeats';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { CompareResults } from './components/CompareResults';
import { RidePicker } from './components/RidePicker';
import { SimilarRidesCard } from './components/SimilarRidesCard';
import { RIDE_LIMIT } from './constants';
import { withRide, type RideSlot } from './search';

const route = getRouteApi('/compare');

/** Two rides side by side and overlaid, chosen in the URL (`?a=…&b=…`). */
export const ComparePage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const rides = useActivities({ sport: 'cycling', limit: RIDE_LIMIT });
  const rideA = useActivity(search.a ?? '', { enabled: Boolean(search.a) });
  const rideB = useActivity(search.b ?? '', { enabled: Boolean(search.b) });
  const workoutA = useActivityWorkout(search.a ?? '', { enabled: Boolean(search.a) });
  const routeA = useActivityRoute(search.a ?? '', { enabled: Boolean(search.a) });

  const pickRide = (slot: RideSlot, id: string) => void navigate({ search: withRide(search, slot, id) });
  const allRides = rides.data?.items ?? [];
  const showsSuggestions = rideA.data !== undefined && !search.b;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Compare rides</h1>
      {rides.error && <ErrorMessage error={rides.error} />}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <RidePicker slot="a" value={search.a} rides={allRides} onChange={(id) => pickRide('a', id)} />
        <RidePicker slot="b" value={search.b} rides={allRides} onChange={(id) => pickRide('b', id)} />
      </div>

      {showsSuggestions && (
        <SimilarRidesCard
          ride={rideA.data}
          rides={allRides}
          workout={workoutA.data ?? null}
          route={routeA.data ?? null}
          onPick={(id) => pickRide('b', id)}
        />
      )}

      <CompareResults rideA={rideA} rideB={rideB} hasBothRides={Boolean(search.a && search.b)} />
    </div>
  );
};
