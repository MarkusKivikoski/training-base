import { formatElevation } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { biggestGainDetail, climbLength, longestClimbDetail } from '../../lib/recordText';
import type { RecordsScope } from '../../types';
import { ClimbPodium } from '../podium/ClimbPodium';

type ClimbRecordsCardProps = {
  scope: RecordsScope;
  periodLabel: string;
  year: number | undefined;
};

/** The longest climbs and the climbs with the most elevation gain. */
export const ClimbRecordsCard = ({ scope, periodLabel, year }: ClimbRecordsCardProps) => (
  <Card title={`Climbs · ${periodLabel}`} className="lg:col-span-2">
    <div className="grid gap-5 sm:grid-cols-2">
      <ClimbPodium
        title="Longest climb"
        entries={scope.climbs.longest}
        value={(entry) => climbLength(entry.value)}
        detail={longestClimbDetail}
      />
      <ClimbPodium
        title="Biggest elevation gain on a climb"
        entries={scope.climbs.biggestGain}
        value={(entry) => formatElevation(entry.value)}
        detail={biggestGainDetail}
      />
    </div>
    <p className="mt-3 text-xs text-ink-3">
      Distinct climbs found in your outdoor rides (see Climbs), each hill counted once and dated by the last time you
      rode it
      {year ? ` in ${year}` : ''}. Gain is bottom to top. For the most climbing in one ride, see Ride highs.
    </p>
  </Card>
);
