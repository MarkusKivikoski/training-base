import { formatDurationLabel, formatPower } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import type { RecordsScope } from '../../types';
import { PodiumTable } from '../podium/PodiumTable';

type PowerBestsCardProps = {
  scope: RecordsScope;
};

const NO_DETAIL = () => null;

/** Best power per duration. */
export const PowerBestsCard = ({ scope }: PowerBestsCardProps) => (
  <Card title="Power bests" className="lg:col-span-2">
    <PodiumTable
      rows={scope.power.map((best) => ({ label: formatDurationLabel(best.durationS), entries: best.top }))}
      value={(entry) => formatPower(entry.value)}
      detail={NO_DETAIL}
    />
    <p className="mt-3 text-xs text-ink-3">Rides with a power meter only. Your power data starts in October 2026.</p>
  </Card>
);
