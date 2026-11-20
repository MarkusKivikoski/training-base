import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { MarkerCard } from '@/shared/charts/markers/MarkerCard';
import { MarkerChart } from '@/shared/charts/markers/MarkerChart';
import type { MarkerSeries } from '@/shared/charts/markers/markerChartOption';
import { formatDate, formatHeartRate, formatSport } from '@/shared/lib/formatters';
import { maxHrRows } from '../../lib/markerRows';

type MaxHrCardProps = {
  trends: Trends;
};

const NOTES =
  "Your highest heart rate averaged over 5 seconds each year, from rides only, so a one- or two-second sensor glitch doesn't count. Max heart rate drifts down slowly with age and barely changes with fitness; a low year usually just means no all-out efforts. The highest single reading is listed for comparison.";

/** The best 5-second heart rate per year. */
export const MaxHrCard = ({ trends }: MaxHrCardProps) => {
  const years = trends.maxHr;
  const latest = years.at(-1);

  const series = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'Best 5 s',
        slot: '--series-2',
        kind: 'points',
        points: years.map((year) => ({ date: year.date, value: year.bpm, label: `${year.year} · ${year.name}` })),
      },
    ],
    [years],
  );

  return (
    <MarkerCard
      title="Max heart rate"
      latest={latest ? formatHeartRate(latest.bpm) : '—'}
      latestHint={
        latest
          ? `Best 5 s in ${latest.year}: ${formatDate(latest.date)} · ${latest.name} (${formatSport(latest.sport)})`
          : 'Needs activities with heart rate'
      }
      count={years.length}
      chart={
        <MarkerChart
          series={series}
          format={formatHeartRate}
          throughDate={trends.today}
          ariaLabel="Highest 5-second heart rate per year, one point per year at the activity it came from."
        />
      }
      notes={NOTES}
      rows={maxHrRows(years)}
    />
  );
};
