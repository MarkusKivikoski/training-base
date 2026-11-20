import { Link } from '@tanstack/react-router';
import type { Activity } from '@/shared/api/client';
import { CopyForCoachButton } from '@/shared/coach/CopyForCoachButton';
import { formatDateTime, formatSport } from '@/shared/lib/formatters';
import { EnvironmentBadge } from '@/shared/ui/EnvironmentBadge';
import { Badge } from './Badge';
import { BikeSelect } from './BikeSelect';
import { TyreSelect } from './TyreSelect';
import { WorkoutTypeSelect } from './WorkoutTypeSelect';

type RideHeaderProps = {
  activity: Activity;
};

/** The activity's name, start time, badges, bike and tyres, with links to compare it and copy it for a coach. */
export const RideHeader = ({ activity }: RideHeaderProps) => (
  <header className="mb-4 mt-2">
    <h1 className="text-2xl font-bold tracking-tight">{activity.name}</h1>
    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-2">
      <span>{formatDateTime(activity.startTimeLocal)}</span>
      {activity.isCycling && <EnvironmentBadge isIndoor={activity.isIndoor} isCycling sport={activity.sport} />}
      <Badge>{formatSport(activity.sport)}</Badge>
      {activity.hasPower && <Badge>Power meter</Badge>}
      <WorkoutTypeSelect activity={activity} />
      <BikeSelect activity={activity} />
      <TyreSelect activity={activity} />
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {activity.isCycling && (
          <Link to="/compare" search={{ a: activity.id }} className="text-sm text-ink-2 hover:text-ink hover:underline">
            Compare with another ride →
          </Link>
        )}
        <CopyForCoachButton activities={[activity]} />
      </div>
    </div>
  </header>
);
