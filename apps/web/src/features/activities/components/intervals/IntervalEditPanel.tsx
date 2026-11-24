import { useState } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import type { IntervalEditor } from '../../hooks/useIntervalEditor';
import { IntervalForm } from './IntervalForm';

type IntervalEditPanelProps = {
  editor: IntervalEditor;
  stream: ActivityStreams;
  ftp: number | null;
};

/** Below the intervals table: the add or trim form, or the buttons that open it and undo hand edits. */
export const IntervalEditPanel = ({ editor, stream, ftp }: IntervalEditPanelProps) => {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const resetToDetected = () => {
    setIsConfirmingReset(false);
    editor.resetToDetected();
  };

  return (
    <div className="mt-3">
      {editor.draft ? (
        <IntervalForm editor={editor} draft={editor.draft} stream={stream} ftp={ftp} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {editor.undoDescription && (
            <button
              type="button"
              onClick={editor.undo}
              disabled={editor.isSaving}
              aria-label={`Undo: ${editor.undoDescription}`}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0"
            >
              ↶ Undo <span className="font-normal text-ink-3">· {editor.undoDescription}</span>
            </button>
          )}
          <button
            type="button"
            onClick={editor.startAdding}
            disabled={editor.isSaving}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-0"
          >
            Add interval
          </button>
          {editor.isHandSet && (
            <button
              type="button"
              onClick={() => setIsConfirmingReset(true)}
              disabled={editor.isSaving}
              className="px-2 py-1.5 text-sm text-ink-2 hover:underline"
            >
              Use detected intervals
            </button>
          )}
        </div>
      )}
      {editor.saveError && <ErrorMessage error={editor.saveError} />}
      {isConfirmingReset && (
        <ConfirmationModal
          title="Go back to the detected intervals?"
          message="Your added, trimmed and removed intervals on this ride are dropped."
          confirmLabel="Use detected"
          isDestructive
          onConfirm={resetToDetected}
          onCancel={() => setIsConfirmingReset(false)}
        />
      )}
    </div>
  );
};
