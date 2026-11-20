import { useId, type ReactNode } from 'react';
import { Dialog } from './Dialog';

type ConfirmationModalProps = {
  /** The question, e.g. "Delete Road bike?". */
  title: string;
  /** What happens if you go ahead, below the question. */
  message?: ReactNode;
  confirmLabel: string;
  /** Marks the confirm button as one that deletes or undoes something. */
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const CONFIRM_CLASS = 'rounded-lg px-3 py-1.5 text-sm font-medium';
const DESTRUCTIVE_CLASS = `${CONFIRM_CLASS} bg-status-critical text-white`;
const DEFAULT_CLASS = `${CONFIRM_CLASS} bg-ink text-surface-1`;

/**
 * Asks before an action goes ahead, in place of the browser's `confirm()`. Cancel comes first, so it
 * has the focus when the modal opens: Enter alone never confirms.
 */
export const ConfirmationModal = ({
  title,
  message,
  confirmLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  const titleId = useId();

  return (
    <Dialog labelledBy={titleId} onCancel={onCancel}>
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      {message && <p className="mt-1 text-sm text-ink-2">{message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-0"
        >
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={isDestructive ? DESTRUCTIVE_CLASS : DEFAULT_CLASS}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
};
