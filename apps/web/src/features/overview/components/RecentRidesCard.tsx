import { Link } from '@tanstack/react-router';
import { CopyForCoachButton } from '@/shared/coach/CopyForCoachButton';
import { ActivityList } from '@/shared/ui/ActivityList';
import { Card } from '@/shared/ui/Card';
import type { Activity } from '@/shared/api/client';

type RecentRidesCardProps = {
  rides: Activity[];
};

const RIDES_SHOWN = 6;

/** The latest rides, each with a copy-for-coach button, and a link to all activities. */
export const RecentRidesCard = ({ rides }: RecentRidesCardProps) => (
  <Card
    title="Recent rides"
    className="sm:col-span-2 xl:col-span-4"
    action={
      <Link to="/activities" className="text-xs text-ink-2 hover:text-ink">
        All activities →
      </Link>
    }
  >
    <ActivityList
      activities={rides.slice(0, RIDES_SHOWN)}
      compact
      rowAction={(ride) => <CopyForCoachButton activities={[ride]} compact />}
    />
  </Card>
);
