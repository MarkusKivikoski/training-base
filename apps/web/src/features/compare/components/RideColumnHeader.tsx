import { Link } from '@tanstack/react-router';
import type { Activity } from '@/shared/api/client';
import { formatDate, formatSport } from '@/shared/lib/formatters';
import type { RideSlot } from '../search';
import { RideSwatch } from './RideSwatch';

type RideColumnHeaderProps = {
  slot: RideSlot;
  ride: Activity;
};

/** A table column heading for one ride: its colour, date (linking to the ride), name and type. */
export const RideColumnHeader = ({ slot, ride }: RideColumnHeaderProps) => (
  <>
    <span className="inline-flex items-center gap-1.5">
      <RideSwatch slot={slot} />
      <Link to="/activities/$activityId" params={{ activityId: ride.id }} className="text-ink hover:underline">
        {slot.toUpperCase()}: {formatDate(ride.date)}
      </Link>
    </span>
    <span className="block text-[11px] font-normal text-ink-3">
      {ride.name} · {formatSport(ride.sport)}
    </span>
  </>
);
