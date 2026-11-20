import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { MarkerCard, type MarkerRow } from '@/shared/charts/markers/MarkerCard';
import { MarkerChart } from '@/shared/charts/markers/MarkerChart';
import type { MarkerSeries } from '@/shared/charts/markers/markerChartOption';
import {
  DECOUPLING_EXPLANATION,
  decouplingBasisLabel,
  decouplingVerdict,
  formatDecoupling,
} from '@/shared/lib/decoupling';
import { formatDate } from '@/shared/lib/formatters';

type DecouplingCardProps = {
  trends: Trends;
};

/** Aerobic decoupling per long ride, power-based and speed-based as separate series. */
export const DecouplingCard = ({ trends }: DecouplingCardProps) => {
  const rides = trends.decoupling;
  const latest = rides.at(-1);

  const series = useMemo((): MarkerSeries[] => {
    const toPoints = (basis: 'power' | 'speed') =>
      rides
        .filter((ride) => ride.basis === basis)
        .map((ride) => ({ date: ride.date, value: ride.percent, label: ride.name }));
    const all: MarkerSeries[] = [
      { name: 'Power vs heart rate', slot: '--series-1', kind: 'points', points: toPoints('power') },
      { name: 'Speed vs heart rate', slot: '--series-2', kind: 'points', points: toPoints('speed') },
    ];
    // Leave out an empty series, so the legend only lists what's there.
    return all.filter((one) => one.points.length > 0);
  }, [rides]);

  const rows = rides.map((ride): MarkerRow => [
    `${formatDate(ride.date)} · ${ride.basis}`,
    formatDecoupling(ride.percent),
  ]);

  return (
    <MarkerCard
      title="Aerobic decoupling"
      latest={latest ? formatDecoupling(latest.percent) : '—'}
      latestHint={
        latest
          ? `${formatDate(latest.date)} · ${decouplingVerdict(latest.percent)}, ${decouplingBasisLabel(latest.basis)}`
          : 'Needs a ride of an hour or more with heart rate'
      }
      count={rides.length}
      chart={
        <MarkerChart
          series={series}
          format={formatDecoupling}
          throughDate={trends.today}
          ariaLabel="Aerobic decoupling per ride of an hour or more, in percent; lower is better. Power-based and speed-based rides are separate series."
        />
      }
      notes={`${DECOUPLING_EXPLANATION} Lower is better; compare like with like.`}
      rows={rows}
    />
  );
};
