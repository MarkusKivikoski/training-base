import { formatShortDate } from '@/shared/lib/formatters';
import { usePlanEditor } from './planEditorContext';

type AddPlanButtonProps = {
  date: string;
  /** Show the word "Plan" next to the plus (the agenda); the grid shows the plus alone. */
  withLabel?: boolean;
};

/** "+": plans a session or an event on this day. In the grid it shows when the day is hovered or focused. */
export const AddPlanButton = ({ date, withLabel = false }: AddPlanButtonProps) => {
  const { openNew } = usePlanEditor();

  return (
    <button
      type="button"
      onClick={() => openNew(date)}
      aria-label={`Plan a session or event on ${formatShortDate(date)}`}
      className={
        withLabel
          ? 'rounded-md border border-dashed border-line px-2 py-0.5 text-xs text-ink-2 hover:text-ink'
          : 'rounded-md px-1 text-sm leading-none text-ink-3 opacity-0 hover:text-ink focus:opacity-100 group-hover:opacity-100'
      }
    >
      +{withLabel && ' Plan'}
    </button>
  );
};
