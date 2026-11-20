import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { formatDate, formatPower, formatVo2 } from '@/shared/lib/formatters';
import { MarkerCard, type MarkerRow } from './MarkerCard';
import { MarkerChart } from './MarkerChart';
import type { MarkerSeries } from './markerChartOption';
import { POWER_NOTE } from './powerNote';

type Vo2maxCardProps = {
  points: Trends['vo2max'];
  today: string;
  className?: string | undefined;
};

const NOTES = `An estimate, not Garmin's value (Garmin's VO₂ max isn't available through its API): the ACSM cycling equation (1.8 × W × 6.12 / kg + 7) applied to your best 5-min power in the previous 90 days. It's only as good as your hardest 5-min effort. ${POWER_NOTE}`;

/** The axis shows the number only; the unit is in the title. */
const formatAxisValue = (value: number) => formatVo2(value).replace(' ml/kg/min', '');

/**
 * The app's own VO₂ max estimate (weekly, from the best 5-min power in the previous 90 days),
 * shown on Trends and under the Power Curve. Always labelled an estimate: Garmin's VO₂ max isn't
 * available through the Personal API.
 */
export const Vo2maxCard = ({ points, today, className }: Vo2maxCardProps) => {
  const latest = points.at(-1);

  const series = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'VO₂ max estimate',
        slot: '--series-1',
        kind: 'line',
        points: points.map((point) => ({
          date: point.date,
          value: point.vo2max,
          label: `Best 5 min ${formatPower(point.best5minW)} at ${point.kg} kg`,
        })),
      },
    ],
    [points],
  );
  const rows = points.map((point): MarkerRow => [formatDate(point.date), formatVo2(point.vo2max)]);

  return (
    <MarkerCard
      title="VO₂ max estimate"
      className={className}
      latest={latest ? formatVo2(latest.vo2max) : '—'}
      latestHint={
        latest
          ? `Best 5 min ${formatPower(latest.best5minW)} at ${latest.kg} kg, last 90 days`
          : 'Needs a ride with power and a weight setting'
      }
      count={points.length}
      chart={
        <MarkerChart
          series={series}
          format={formatAxisValue}
          throughDate={today}
          ariaLabel="Weekly VO2 max estimate in ml/kg/min, from the best 5-minute power in the previous 90 days."
        />
      }
      notes={NOTES}
      rows={rows}
    />
  );
};
