import type { Classified, LoadStatus } from '@app/metrics';
import { formatDate } from '@/shared/lib/formatters';

/** Icon and colour per status. The colour sits on the icon only; the label stays in ink. */
const STATUS_LOOK: Record<LoadStatus, { icon: string; color: string }> = {
  good: { icon: '✓', color: 'text-status-good' },
  warning: { icon: '▲', color: 'text-status-warning' },
  serious: { icon: '!', color: 'text-status-serious' },
  critical: { icon: '✕', color: 'text-status-critical' },
  neutral: { icon: '•', color: 'text-ink-3' },
};

type StatusChipProps = {
  status: Classified;
  /** The first day with zones, shown during the baseline period ("Building baseline until …"). */
  baselineUntil: string | null;
  detail?: string | undefined;
};

/** A training-status label with its icon, e.g. "✓ Optimal". In the baseline period, says when zones start. */
export const StatusChip = ({ status, baselineUntil, detail }: StatusChipProps) => {
  if (status.baseline) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-ink-3"
        title="Zones need about 6 weeks of load history to be meaningful."
      >
        <span aria-hidden>◷</span>
        Building baseline{baselineUntil ? ` until ${formatDate(baselineUntil)}` : ''}
      </span>
    );
  }

  const look = STATUS_LOOK[status.zone.status];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
      <span aria-hidden className={`font-bold ${look.color}`}>
        {look.icon}
      </span>
      <span className="font-medium text-ink">{status.zone.label}</span>
      {detail && <span className="text-ink-3">· {detail}</span>}
    </span>
  );
};
