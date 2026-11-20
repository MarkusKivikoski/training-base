import { getRouteApi, Link } from '@tanstack/react-router';
import { formatDate } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { useClimb } from './api';
import { ClimbMap } from './components/detail/ClimbMap';
import { ClimbName } from './components/detail/ClimbName';
import { ClimbStats } from './components/detail/ClimbStats';
import { EffortHistoryChart } from './components/detail/EffortHistoryChart';
import { EffortsCard } from './components/detail/EffortsCard';
import { ProfileChart } from './components/detail/ProfileChart';
import { rideCount } from './lib/efforts';

const route = getRouteApi('/climbs/$climbId');

/** One climb: its stats, map, profile, times over the years and every effort. */
export const ClimbDetailPage = () => {
  const { climbId } = route.useParams();
  const climb = useClimb(climbId);

  if (climb.isPending) return <Loading />;
  if (climb.error) return <ErrorMessage error={climb.error} />;

  const { efforts } = climb.data;
  const rides = rideCount(efforts);
  const effortsText = efforts.length > rides ? `, ${efforts.length} efforts` : '';

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <Link to="/climbs" className="text-xs text-ink-2 hover:underline">
          ← Climbs
        </Link>
        <ClimbName climb={climb.data} />
        <p className="text-sm text-ink-2">
          First ridden {formatDate(efforts[0]!.date)} · {rides} {rides === 1 ? 'ride' : 'rides'}
          {effortsText}
        </p>
      </div>

      <ClimbStats climb={climb.data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Map">
          <ClimbMap path={climb.data.path} />
        </Card>
        <Card title="Profile">
          <ProfileChart profile={climb.data.profile} />
        </Card>
      </div>

      {efforts.length > 1 && (
        <Card title="Times over the years">
          <EffortHistoryChart climb={climb.data} />
        </Card>
      )}

      <EffortsCard climb={climb.data} />
    </div>
  );
};
