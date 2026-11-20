import { ftpPerKgSeries } from '@app/metrics';
import { useMemo } from 'react';
import { useSettings } from '@/shared/api/settings';
import { MarkerCard, type MarkerRow } from '@/shared/charts/markers/MarkerCard';
import { MarkerChart } from '@/shared/charts/markers/MarkerChart';
import type { MarkerSeries } from '@/shared/charts/markers/markerChartOption';
import { formatDate, formatWattsPerKg } from '@/shared/lib/formatters';
import { sortedWeights, weightChangeText } from '../../lib/weightText';

type WeightCardProps = {
  today: string;
};

const formatKg = (kg: number) => `${kg.toFixed(1)} kg`;

/** Your weight over time (a step line, from Settings), and FTP per kg as weight and FTP change. */
export const WeightCard = ({ today }: WeightCardProps) => {
  const settings = useSettings();
  const weights = useMemo(() => sortedWeights(settings.data?.weightHistory ?? []), [settings.data]);
  const ftpPerKg = useMemo(
    () => ftpPerKgSeries(settings.data?.ftpHistory ?? [], settings.data?.weightHistory ?? []),
    [settings.data],
  );

  const weightSeries = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'Weight',
        slot: '--series-1',
        kind: 'step',
        points: weights.map((entry) => ({ date: entry.from, value: entry.kg, label: entry.note })),
      },
    ],
    [weights],
  );
  const perKgSeries = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'FTP per kg',
        slot: '--series-2',
        kind: 'step',
        points: ftpPerKg.map((point) => ({
          date: point.date,
          value: point.wattsPerKg,
          label: `${point.ftp} W at ${formatKg(point.kg)}`,
        })),
      },
    ],
    [ftpPerKg],
  );

  const latest = weights.at(-1);
  const latestPerKg = ftpPerKg.at(-1);
  const hintParts = [
    latest ? `Since ${formatDate(latest.from)}` : 'Add your weight on the Settings page',
    weightChangeText(weights),
    latestPerKg ? `FTP ${formatWattsPerKg(latestPerKg.wattsPerKg)}` : null,
  ].filter((part): part is string => part !== null);
  const rows = weights.map((entry): MarkerRow => [formatDate(entry.from), formatKg(entry.kg)]);

  return (
    <MarkerCard
      title="Weight & FTP per kg"
      latest={latest ? formatKg(latest.kg) : '—'}
      latestHint={hintParts.join(' · ')}
      count={weights.length}
      chart={
        <div className="space-y-2">
          <MarkerChart
            series={weightSeries}
            format={formatKg}
            throughDate={today}
            ariaLabel="Weight over time from your Settings entries, as a step line."
          />
          {ftpPerKg.length >= 2 && (
            <MarkerChart
              series={perKgSeries}
              format={formatWattsPerKg}
              throughDate={today}
              ariaLabel="FTP per kilogram over time, changing whenever the FTP or the weight changes."
            />
          )}
        </div>
      }
      notes="From the weight and FTP entries on the Settings page. W/kg uses the FTP in effect on each date; your earliest weight also applies before it."
      rows={rows}
    />
  );
};
