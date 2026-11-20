import { Link } from '@tanstack/react-router';
import type { Activity } from '@/shared/api/client';
import { useGear, useSetRideBike } from '@/shared/api/gear';
import { bikeByType } from '@/shared/lib/gear';

type BikeSelectProps = {
  activity: Activity;
};

/** Value of the "by ride type" option; "none" is no bike; anything else is a bike id. */
const BY_TYPE = '';

/** Which bike the ride was on: by its type (the default), a chosen bike, or no bike. */
export const BikeSelect = ({ activity }: BikeSelectProps) => {
  const gear = useGear();
  const setRideBike = useSetRideBike();

  if (!activity.isCycling || !gear.data) return null;
  if (gear.data.bikes.length === 0) {
    return (
      <Link to="/gear" className="text-sm text-ink-2 hover:text-ink hover:underline">
        Add your bikes →
      </Link>
    );
  }

  const byType = bikeByType(activity, gear.data);
  const value = gear.data.overrides[activity.id] ?? BY_TYPE;

  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      Bike
      <select
        value={value}
        disabled={setRideBike.isPending}
        onChange={(event) =>
          setRideBike.mutate({
            activityId: activity.id,
            bikeId: event.target.value === BY_TYPE ? null : event.target.value,
          })
        }
        className="rounded-lg border border-line bg-surface-1 px-2 py-1 text-sm text-ink"
      >
        <option value={BY_TYPE}>By ride type ({byType?.name ?? 'no bike'})</option>
        {gear.data.bikes.map((bike) => (
          <option key={bike.id} value={bike.id}>
            {bike.name}
            {bike.retired ? ' (retired)' : ''}
          </option>
        ))}
        <option value="none">No bike</option>
      </select>
    </label>
  );
};
