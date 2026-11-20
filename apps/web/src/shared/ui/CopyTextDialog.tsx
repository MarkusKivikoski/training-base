import { useEffect, useRef } from 'react';
import { Dialog } from './Dialog';

const HEADING_ID = 'copy-text-heading';

type CopyTextDialogProps = {
  title: string;
  text: string;
  onClose: () => void;
};

/** Text selected and ready for Ctrl+C, for when the browser blocks the clipboard. */
export const CopyTextDialog = ({ title, text, onClose }: CopyTextDialogProps) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.select();
  }, []);

  return (
    <Dialog labelledBy={HEADING_ID} onCancel={onClose}>
      <h2 id={HEADING_ID} className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        The browser blocked the clipboard here. The text is selected: press Ctrl+C to copy it.
      </p>
      <textarea
        ref={textAreaRef}
        readOnly
        value={text}
        rows={12}
        className="mt-3 w-full rounded-lg border border-line bg-surface-0 p-2 font-mono text-xs"
      />
      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
};
