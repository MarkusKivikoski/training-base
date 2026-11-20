import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { formatElevation, formatHeartRate, formatTimeOfDay } from '@/shared/lib/formatters';
import { RECORD_RULES } from '@/shared/lib/recordRules';
import { Card } from '@/shared/ui/Card';
import { hillinessText } from '../../lib/recordText';
import type { RecordsScope } from '../../types';
import { PodiumList } from '../podium/PodiumList';

type RideHighsCardProps = {
  scope: RecordsScope;
  discipline: Discipline;
};

/** Most climbing, fastest average, highest heart rate, hilliest ride (or run) and earliest start. */
export const RideHighsCard = ({ scope, discipline }: RideHighsCardProps) => {
  const { highs } = scope;
  const { formatAverage, averageMinKm, hilliestMinKm } = RECORD_RULES[discipline];
  const words = DISCIPLINE_WORDS[discipline];

  return (
    <Card title={`${words.titleOne} highs`}>
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <PodiumList title="Most climbing" entries={highs.elevation} value={(entry) => formatElevation(entry.value)} />
        <PodiumList
          title={`Fastest average (${averageMinKm} km+)`}
          entries={highs.avgSpeed}
          value={(entry) => formatAverage(entry.value)}
        />
        <PodiumList title="Highest heart rate" entries={highs.maxHr} value={(entry) => formatHeartRate(entry.value)} />
        <PodiumList
          title={`Hilliest ${words.one} (${hilliestMinKm} km+)`}
          entries={highs.hilliest}
          value={(entry) => hillinessText(entry.value)}
        />
        <PodiumList
          title="Earliest start"
          entries={highs.earliestStart}
          value={(entry) => formatTimeOfDay(entry.value)}
        />
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Fastest average: outdoor {words.many} of {averageMinKm} km or more, distance over moving time measured from the{' '}
        {words.one} data. Hilliest: metres climbed per km, outdoor {words.many} of {hilliestMinKm} km or more. Earliest
        start: local start time, from 04:00 (a {words.one} home in the small hours isn&apos;t an early start).
      </p>
    </Card>
  );
};
