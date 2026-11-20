import type { PlannedEvent } from '@/shared/api/client';
import { formatDate, formatLoad } from '@/shared/lib/formatters';
import { countdownText } from '@/shared/lib/plan';
import type { FitnessRow } from '../../lib/fitnessRows';

type EventCountdownProps = {
  event: PlannedEvent;
  /** The fitness row on the event day (projected when it's ahead). */
  row: FitnessRow;
  today: string;
  /** Planned sessions between today and the event. */
  plannedSessions: number;
};

/** The next target event: when it is and the form you're heading for on the day. */
export const EventCountdown = ({ event, row, today, plannedSessions }: EventCountdownProps) => {
  const { form } = row.status;
  const formZone = form.baseline ? '' : ` (${form.zone.label})`;
  const sessionText =
    plannedSessions === 0
      ? 'No sessions planned before it, so this assumes rest.'
      : `From your ${plannedSessions} planned ${plannedSessions === 1 ? 'session' : 'sessions'}; unplanned days count as rest.`;

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm">
      <p className="text-ink">
        <span aria-hidden className="mr-1 text-ink-2">
          ⚑
        </span>
        <span className="font-semibold">{event.name}</span> · {formatDate(event.date)} ·{' '}
        <span className="font-medium">{countdownText(today, event.date)}</span>
      </p>
      <p className="mt-0.5 text-ink-2">
        Projected form on the day: <span className="font-semibold text-ink">{formatLoad(row.tsb, true)}</span>
        {formZone} · fitness {formatLoad(row.ctl)}, fatigue {formatLoad(row.atl)}.{' '}
        <span className="text-xs text-ink-3">{sessionText}</span>
      </p>
    </div>
  );
};
