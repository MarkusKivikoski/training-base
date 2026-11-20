import { Link } from '@tanstack/react-router';
import type { Activity } from '@/shared/api/client';
import { useGear, useSetRideTyre } from '@/shared/api/gear';

type TyreSelectProps = {
  activity: Activity;
};

/** Value of the "not set" option; anything else is a tyre id. */
const NOT_SET = '';

/**
 * Which tyres an outdoor ride was on. Optional, and can be set or changed at any time; the Same
 * route table shows it. Indoor rides and other sports have no tyre choice.
 */
export const TyreSelect = ({ activity }: TyreSelectProps) => {
  const gear = useGear();
  const setRideTyre = useSetRideTyre();

  const isOutdoorRide = activity.isCycling && !activity.isIndoor;
  if (!isOutdoorRide || !gear.data) return null;
  if (gear.data.tyres.length === 0) {
    return (
      <Link to="/gear" className="text-sm text-ink-2 hover:text-ink hover:underline">
        Add your tyres →
      </Link>
    );
  }

  const value = gear.data.rideTyres[activity.id] ?? NOT_SET;

  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      Tyres
      <select
        value={value}
        disabled={setRideTyre.isPending}
        onChange={(event) =>
          setRideTyre.mutate({
            activityId: activity.id,
            tyreId: event.target.value === NOT_SET ? null : event.target.value,
          })
        }
        className="rounded-lg border border-line bg-surface-1 px-2 py-1 text-sm text-ink"
      >
        <option value={NOT_SET}>Not set</option>
        {gear.data.tyres.map((tyre) => (
          <option key={tyre.id} value={tyre.id}>
            {tyre.name}
          </option>
        ))}
      </select>
    </label>
  );
};
