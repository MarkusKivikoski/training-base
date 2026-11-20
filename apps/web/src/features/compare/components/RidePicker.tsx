import type { Activity } from '@/shared/api/client';
import { rideLabel, ridesByYear } from '../lib/similarRides';
import type { RideSlot } from '../search';
import { RideSwatch } from './RideSwatch';

type RidePickerProps = {
  slot: RideSlot;
  /** The chosen ride's id. */
  value: string | undefined;
  rides: readonly Activity[];
  /** Called with the chosen id, or '' for none. */
  onChange: (id: string) => void;
};

/** A menu of all rides, grouped by year, for ride A or B. */
export const RidePicker = ({ slot, value, rides, onChange }: RidePickerProps) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-2">
    <span className="inline-flex items-center gap-1.5 font-medium">
      <RideSwatch slot={slot} />
      Ride {slot.toUpperCase()}
    </span>
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink"
    >
      <option value="">Choose a ride…</option>
      {ridesByYear(rides).map((group) => (
        <optgroup key={group.year} label={group.year}>
          {group.rides.map((ride) => (
            <option key={ride.id} value={ride.id}>
              {rideLabel(ride)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </label>
);
