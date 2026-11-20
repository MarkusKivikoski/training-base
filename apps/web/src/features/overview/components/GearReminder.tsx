import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useActivities } from '@/shared/api/activities';
import { useGear } from '@/shared/api/gear';
import { componentsNeedingAttention } from '@/shared/lib/gear';

/** At most this many components are listed; the Gear page has the rest. */
const SHOWN = 3;
const RIDE_LIMIT = 1000;

/** A short line when chains, tyres or other components are due or nearly due. Nothing otherwise. */
export const GearReminder = () => {
  const gear = useGear();
  const rides = useActivities({ sport: 'cycling', limit: RIDE_LIMIT });

  const needing = useMemo(() => {
    if (!gear.data || !rides.data) return [];
    return componentsNeedingAttention(rides.data.items, gear.data);
  }, [gear.data, rides.data]);

  if (needing.length === 0 || !gear.data) return null;
  const bikeName = (bikeId: string) => gear.data.bikes.find((bike) => bike.id === bikeId)?.name ?? 'a bike';

  return (
    <div role="status" className="mb-4 rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm">
      <ul className="space-y-1">
        {needing.slice(0, SHOWN).map((usage) => {
          const isDue = usage.status === 'due';
          return (
            <li key={usage.component.id} className="text-ink">
              <span aria-hidden className={`mr-1 font-bold ${isDue ? 'text-status-critical' : 'text-status-warning'}`}>
                {isDue ? '✕' : '▲'}
              </span>
              <span className="font-medium">{usage.component.name}</span> on {bikeName(usage.component.bikeId)}:{' '}
              {isDue ? 'due for replacing' : 'nearly due'} ({Math.round((usage.fraction ?? 0) * 100)}% of its interval)
            </li>
          );
        })}
      </ul>
      <Link to="/gear" className="mt-1 inline-block text-xs text-ink-2 underline hover:text-ink">
        {needing.length > SHOWN ? `See all ${needing.length} on the Gear page` : 'Gear page'}
      </Link>
    </div>
  );
};
