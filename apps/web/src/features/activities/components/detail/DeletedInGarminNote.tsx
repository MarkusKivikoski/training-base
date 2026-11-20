import { formatDate } from '@/shared/lib/formatters';

type DeletedInGarminNoteProps = {
  /** When `npm run check-deleted` last ran (ISO timestamp), if known. */
  checkedAt: string | null | undefined;
};

/** Says this activity is gone from Garmin Connect, and how to remove it here. */
export const DeletedInGarminNote = ({ checkedAt }: DeletedInGarminNoteProps) => {
  const checkedText = checkedAt ? ` (${formatDate(checkedAt.slice(0, 10))})` : '';

  return (
    <p role="status" className="mt-3 rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2">
      <span aria-hidden className="mr-1 font-bold text-status-warning">
        ▲
      </span>
      Not found in Garmin Connect when last checked{checkedText}: it was probably deleted there. To remove it here, run{' '}
      <code>npm run check-deleted -- --quarantine</code>.
    </p>
  );
};
