import { FATIGUE_ZONES, FORM_ZONES, RAMP_ZONES } from '@app/metrics';
import { formatLoad } from '@/shared/lib/formatters';
import { ZoneList } from './ZoneList';

const formatFitnessChange = (value: number) => formatLoad(value, true);
const formatTimesFitness = (value: number) => `${value}×`;
const formatPercentOfFitness = (value: number) => `${value > 0 ? '+' : ''}${value}%`;

/** "How zones work": every zone of fitness, fatigue and form with its range. */
export const ZoneGuide = () => (
  <details className="mt-2 text-xs text-ink-2">
    <summary className="cursor-pointer text-ink-3 hover:text-ink">How zones work</summary>
    <dl className="mt-2 grid gap-2 sm:grid-cols-3">
      <ZoneList title="Fitness: change over 7 days" zones={RAMP_ZONES} format={formatFitnessChange} />
      <ZoneList title="Fatigue: × fitness" zones={FATIGUE_ZONES} format={formatTimesFitness} />
      <ZoneList title="Form: % of fitness" zones={FORM_ZONES} format={formatPercentOfFitness} />
    </dl>
  </details>
);
