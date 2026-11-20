import type { GoalMetric, GoalPeriod } from '@app/metrics';
import { GOAL_METRICS, GOAL_PERIODS } from '../../lib/goalText';
import type { GoalDraft } from './goalDraft';

type GoalDraftRowProps = {
  draft: GoalDraft;
  onChange: (patch: Partial<GoalDraft>) => void;
  onRemove: () => void;
};

const FIELD_CLASS = 'rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink';

const metricOptionLabel = (metric: (typeof GOAL_METRICS)[number]) =>
  metric.unit === 'rides' ? 'rides' : `${metric.unit} (${metric.label.toLowerCase()})`;

/** One goal in the editor: target, measure, period and a remove button. */
export const GoalDraftRow = ({ draft, onChange, onRemove }: GoalDraftRowProps) => {
  const isTargetInvalid = !(Number(draft.text.replace(',', '.')) > 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`target-${draft.id}`}>
        Target
      </label>
      <input
        id={`target-${draft.id}`}
        inputMode="decimal"
        value={draft.text}
        onChange={(event) => onChange({ text: event.target.value })}
        aria-invalid={isTargetInvalid}
        className={`${FIELD_CLASS} w-28 tabular-nums ${isTargetInvalid ? 'border-status-critical' : ''}`}
      />

      <label className="sr-only" htmlFor={`metric-${draft.id}`}>
        Measure
      </label>
      <select
        id={`metric-${draft.id}`}
        value={draft.metric}
        onChange={(event) => onChange({ metric: event.target.value as GoalMetric })}
        className={FIELD_CLASS}
      >
        {GOAL_METRICS.map((metric) => (
          <option key={metric.value} value={metric.value}>
            {metricOptionLabel(metric)}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor={`period-${draft.id}`}>
        Period
      </label>
      <select
        id={`period-${draft.id}`}
        value={draft.period}
        onChange={(event) => onChange({ period: event.target.value as GoalPeriod })}
        className={FIELD_CLASS}
      >
        {GOAL_PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onRemove}
        className="px-2 py-1.5 text-sm text-ink-2 hover:text-ink hover:underline"
      >
        Remove
      </button>
    </div>
  );
};
