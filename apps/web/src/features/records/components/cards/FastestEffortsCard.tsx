import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { formatClock, formatRecordDistance } from '@/shared/lib/formatters';
import { RECORD_RULES } from '@/shared/lib/recordRules';
import { Card } from '@/shared/ui/Card';
import type { RecordsScope } from '../../types';
import { PodiumTable } from '../podium/PodiumTable';

type FastestEffortsCardProps = {
  scope: RecordsScope;
  periodLabel: string;
  discipline: Discipline;
};

/** Fastest time over each record distance, with its average speed (rides) or pace (runs). */
export const FastestEffortsCard = ({ scope, periodLabel, discipline }: FastestEffortsCardProps) => {
  const { formatAverage, glitchLimit } = RECORD_RULES[discipline];
  const words = DISCIPLINE_WORDS[discipline];

  return (
    <Card title={`Fastest efforts · ${periodLabel}`} className="lg:col-span-2">
      <PodiumTable
        rows={scope.efforts.map((effort) => ({ label: formatRecordDistance(effort.distanceM), entries: effort.top }))}
        value={(entry) => formatClock(entry.value)}
        detail={(entry) => (entry.extra === undefined ? null : formatAverage(entry.extra))}
      />
      <p className="mt-3 text-xs text-ink-3">
        Outdoor {words.many}. Elapsed time over the stretch, stops included. Distances come from the device; impossible
        GPS jumps (faster than {glitchLimit}) are ignored, so they can&apos;t create a fake record.
      </p>
    </Card>
  );
};
