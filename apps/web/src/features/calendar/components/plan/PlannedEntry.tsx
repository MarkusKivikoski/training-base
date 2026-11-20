import type { PlanPresets } from '@/shared/api/client';
import { formatTss } from '@/shared/lib/formatters';
import { INTENSITY_LABELS, plannedTss } from '@/shared/lib/plan';
import type { SessionMatch } from '../../lib/planMatching';
import { usePlanEditor } from './planEditorContext';

type PlannedEntryProps = {
  match: SessionMatch;
  presets: PlanPresets;
  /** Smaller text, for the month grid. */
  compact?: boolean;
};

/** The status line under the title: what's planned, or how it went. */
const statusLine = ({ session, status, ride }: SessionMatch, tss: number) => {
  if (status === 'done') return `✓ Done · ${formatTss(ride?.load?.tss ?? 0)} of ${tss} TSS`;
  if (status === 'missed') return `✕ Missed · ${tss} TSS`;
  if (session.intensity === 'custom') return `${tss} TSS`;
  return `${INTENSITY_LABELS[session.intensity]} · ${tss} TSS`;
};

const STATUS_CLASS = {
  done: 'border-solid border-status-good/60',
  missed: 'border-dashed border-ink-3/40 opacity-70',
  upcoming: 'border-dashed border-ink-3/60',
} as const;

/** A planned session in a day: dashed until a ride completes it, ticked when done. Clicking it opens the editor. */
export const PlannedEntry = ({ match, presets, compact = false }: PlannedEntryProps) => {
  const { openEditSession } = usePlanEditor();
  const { session, status } = match;
  const tss = plannedTss(session, presets);
  const line = statusLine(match, tss);

  return (
    <button
      type="button"
      onClick={() => openEditSession(session)}
      title={`Planned: ${session.title} · ${line}. Click to edit.`}
      className={`block w-full rounded-md border px-1.5 py-0.5 text-left hover:bg-surface-0 ${STATUS_CLASS[status]}`}
    >
      <span className="sr-only">Planned session: </span>
      <span className={`block truncate font-medium text-ink-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {session.title}
      </span>
      <span className="block text-xs tabular-nums text-ink-3">{line}</span>
    </button>
  );
};
