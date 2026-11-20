import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { formatDistance, formatDuration, formatSpeed } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import type { RecordsScope } from '../../types';
import { PodiumList } from '../podium/PodiumList';

type SpeedDistanceCardProps = {
  scope: RecordsScope;
  discipline: Discipline;
};

/** Max speed (rides only), longest distance and longest moving time. */
export const SpeedDistanceCard = ({ scope, discipline }: SpeedDistanceCardProps) => {
  const words = DISCIPLINE_WORDS[discipline];
  const hasMaxSpeed = discipline === 'cycling';
  const columns = hasMaxSpeed ? 'sm:grid-cols-3 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-2';

  return (
    <Card title={hasMaxSpeed ? 'Speed & distance' : 'Distance & time'}>
      <div className={`grid gap-5 lg:grid-cols-1 ${columns}`}>
        {hasMaxSpeed && (
          <PodiumList title="Max speed" entries={scope.maxSpeed} value={(entry) => formatSpeed(entry.value)} />
        )}
        <PodiumList
          title="Longest distance"
          entries={scope.longestDistance}
          value={(entry) => formatDistance(entry.value, 1)}
        />
        <PodiumList
          title="Longest moving time"
          entries={scope.longestTime}
          value={(entry) => formatDuration(entry.value)}
        />
      </div>
      <p className="mt-3 text-xs text-ink-3">
        {hasMaxSpeed
          ? "Max speed and distance: outdoor rides. Max speed is the best 3-second average, so GPS spikes don't count. "
          : 'Distance: outdoor runs. '}
        Moving time includes indoor {words.many}.
      </p>
    </Card>
  );
};
