import { useSplitRide } from '../../api';
import { gapText } from '../../lib/recordingGaps';

type MergedRideNoteProps = {
  activityId: string;
  recordingCount: number;
  /** Seconds not recorded before each later recording. */
  gapsS: readonly number[];
};

const BUTTON_CLASS =
  'rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-0 disabled:opacity-50';

/** Says this ride was joined from several recordings and how long went unrecorded, with a way to split it again. */
export const MergedRideNote = ({ activityId, recordingCount, gapsS }: MergedRideNoteProps) => {
  const split = useSplitRide();
  const gaps = gapsS.map(gapText).join(', ');

  return (
    <div role="status" className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>
          Merged from {recordingCount} recordings. Not recorded between them: {gaps}.
        </span>
        <button
          type="button"
          disabled={split.isPending || split.isSuccess}
          onClick={() => split.mutate({ id: activityId })}
          className={BUTTON_CLASS}
        >
          Split again
        </button>
      </div>
      {split.isSuccess && (
        <p className="mt-1 text-xs text-ink-3">Splitting. This page refreshes when the rides are recomputed.</p>
      )}
      {split.error && (
        <p role="alert" className="mt-1 text-xs text-ink-2">
          Couldn’t split the ride: {split.error.message}
        </p>
      )}
    </div>
  );
};
