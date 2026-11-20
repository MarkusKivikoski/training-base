import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { MarkerCard, type MarkerRow } from '@/shared/charts/markers/MarkerCard';
import { MarkerChart } from '@/shared/charts/markers/MarkerChart';
import type { MarkerSeries } from '@/shared/charts/markers/markerChartOption';
import { POWER_NOTE } from '@/shared/charts/markers/powerNote';
import { formatDate, formatEf, formatPower } from '@/shared/lib/formatters';

type EfCardProps = {
  trends: Trends;
};

const NOTES = `Normalized power ÷ average heart rate. Rising EF on similar easy rides means more power for the same heart rate; compare like with like. ${POWER_NOTE}`;

/** Efficiency factor per ride with power and heart rate. */
export const EfCard = ({ trends }: EfCardProps) => {
  const rides = useMemo(() => trends.rides.filter((ride) => ride.ef !== null), [trends.rides]);
  const latest = rides.at(-1);

  const series = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'Efficiency factor',
        slot: '--series-1',
        kind: 'points',
        points: rides.map((ride) => ({ date: ride.date, value: ride.ef!, label: ride.name })),
      },
    ],
    [rides],
  );
  const rows = rides.map((ride): MarkerRow => [formatDate(ride.date), formatEf(ride.ef)]);

  return (
    <MarkerCard
      title="Efficiency factor"
      latest={latest ? formatEf(latest.ef) : '—'}
      latestHint={
        latest
          ? `${formatDate(latest.date)} · NP ${formatPower(latest.np)} at ${Math.round(latest.avgHr ?? 0)} bpm`
          : 'Needs a ride with power and heart rate'
      }
      count={rides.length}
      chart={
        <MarkerChart
          series={series}
          format={formatEf}
          throughDate={trends.today}
          ariaLabel="Efficiency factor (normalized power per average heart rate) per ride with power."
        />
      }
      notes={NOTES}
      rows={rows}
    />
  );
};
