import type { PlannedEvent } from '@/shared/api/client';
import { usePlanEditor } from './planEditorContext';

type EventEntryProps = {
  event: PlannedEvent;
  /** Smaller text, for the month grid. */
  compact?: boolean;
};

/** A target event in a day, with a flag; clicking it opens the editor. */
export const EventEntry = ({ event, compact = false }: EventEntryProps) => {
  const { openEditEvent } = usePlanEditor();

  return (
    <button
      type="button"
      onClick={() => openEditEvent(event)}
      title={`Event: ${event.name}. Click to edit.`}
      className="flex w-full items-baseline gap-1 rounded-md border border-ink/40 bg-surface-0 px-1.5 py-0.5 text-left hover:bg-surface-1"
    >
      <span aria-hidden className="text-ink-2">
        ⚑
      </span>
      <span className="sr-only">Event: </span>
      <span className={`truncate font-semibold text-ink ${compact ? 'text-xs' : 'text-sm'}`}>{event.name}</span>
    </button>
  );
};
