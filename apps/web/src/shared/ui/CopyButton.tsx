import { useEffect, useState } from 'react';
import { CopyTextDialog } from './CopyTextDialog';

const STATUS_RESET_MS = 2000;

type CopyState = 'idle' | 'loading' | 'copied' | 'failed';

const STATE_LABELS: Record<Exclude<CopyState, 'idle'>, string> = {
  loading: 'Copying…',
  copied: 'Copied',
  failed: 'Copy failed',
};

type CopyButtonProps = {
  /** Builds the text when clicked; may load data first. */
  getText: () => string | Promise<string>;
  label: string;
  /** Heading of the fallback dialog. */
  dialogTitle: string;
  /** Icon only, for table rows. */
  compact?: boolean;
  title?: string;
  disabled?: boolean;
};

/**
 * Copies text to the clipboard and says so. Where the browser blocks the clipboard (plain HTTP),
 * the text opens in a dialog to copy by hand instead.
 */
export const CopyButton = ({
  getText,
  label,
  dialogTitle,
  compact = false,
  title,
  disabled = false,
}: CopyButtonProps) => {
  const [state, setState] = useState<CopyState>('idle');
  const [manualText, setManualText] = useState<string | null>(null);

  useEffect(() => {
    if (state !== 'copied' && state !== 'failed') return;
    const timer = setTimeout(() => setState('idle'), STATUS_RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    setState('loading');
    let text: string;
    try {
      text = await getText();
    } catch {
      setState('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('idle');
      setManualText(text);
    }
  };

  const visibleLabel = state === 'idle' ? label : STATE_LABELS[state];

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // Rows and cells may link somewhere; copying shouldn't open it.
          event.preventDefault();
          event.stopPropagation();
          void copy();
        }}
        disabled={state === 'loading' || disabled}
        title={title}
        aria-label={compact ? visibleLabel : undefined}
        className={
          compact
            ? 'rounded p-1 text-ink-3 hover:bg-surface-0 hover:text-ink disabled:opacity-50'
            : 'rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50'
        }
      >
        {compact ? <CopyIcon isDone={state === 'copied'} /> : visibleLabel}
      </button>
      {manualText !== null && (
        <CopyTextDialog title={dialogTitle} text={manualText} onClose={() => setManualText(null)} />
      )}
    </>
  );
};

type CopyIconProps = { isDone: boolean };

const CopyIcon = ({ isDone }: CopyIconProps) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
    {isDone ? (
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
        <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
      </>
    )}
  </svg>
);
