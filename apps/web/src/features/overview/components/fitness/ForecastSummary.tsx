import { Link } from '@tanstack/react-router';
import { formatDate, formatLoad } from '@/shared/lib/formatters';
import type { FitnessRow } from '../../lib/fitnessRows';

type ForecastSummaryProps = {
  rows: readonly FitnessRow[];
};

/**
 * Where the planned sessions take fitness, fatigue and form by the last planned day, or a pointer
 * to the Calendar when nothing is planned.
 */
export const ForecastSummary = ({ rows }: ForecastSummaryProps) => {
  const lastPlanned = rows.at(-1);

  if (!lastPlanned?.isPlanned) {
    return (
      <p className="mt-2 text-xs text-ink-3">
        <Link to="/calendar" className="underline hover:text-ink">
          Plan sessions on the Calendar
        </Link>{' '}
        to see a forecast of your fitness and form here.
      </p>
    );
  }

  const { form } = lastPlanned.status;
  const formZone = form.baseline ? '' : ` (${form.zone.label})`;

  return (
    <p className="mt-2 text-sm text-ink-2">
      <span className="font-medium text-ink">Forecast for {formatDate(lastPlanned.date)}</span>, from your planned
      sessions: fitness {formatLoad(lastPlanned.ctl)}, fatigue {formatLoad(lastPlanned.atl)}, form{' '}
      {formatLoad(lastPlanned.tsb, true)}
      {formZone}. Dashed lines on the chart.
    </p>
  );
};
