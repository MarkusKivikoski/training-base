import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useSaveSetting } from '@/shared/api/settings';
import { formatDate } from '@/shared/lib/formatters';
import { Dialog } from '@/shared/ui/Dialog';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { useDismissThresholdSuggestion } from '../api';
import { useThresholdPrompt } from '../hooks/useThresholdPrompt';
import {
  acceptInput,
  formatThreshold,
  rideLabel,
  THRESHOLD_LABELS,
  type ThresholdPrompt,
} from '../lib/thresholdPrompt';
import { ThresholdChange } from './ThresholdChange';

const PRIMARY_BUTTON = 'rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50';
const SECONDARY_BUTTON = 'rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-0';

/** What each threshold drives, for the dialog's explanation and the saved message. */
const RECOMPUTED: Record<ThresholdPrompt['kind'], { clause: string; sentence: string }> = {
  ftp: {
    clause: 'TSS, zones and fitness are recomputed',
    sentence: 'TSS, zones and fitness are being recomputed in the background.',
  },
  lthr: {
    clause: 'heart-rate TSS, heart-rate zones and fitness are recomputed',
    sentence: 'Heart-rate TSS, heart-rate zones and fitness are being recomputed in the background.',
  },
};

/** A prompt's identity, so one hidden or saved prompt doesn't hide another. */
const promptKey = (prompt: ThresholdPrompt) => `${prompt.kind}:${prompt.activityId}`;

/**
 * Asks to update the FTP or LTHR when a ride beats it. Update saves an estimated entry from the
 * ride's date and recomputes stats; Cancel (or Escape) declines it for that ride. Opening the ride
 * hides the prompt until the page is reloaded.
 */
export const ThresholdUpdatePrompt = () => {
  const titleId = useId();
  const prompt = useThresholdPrompt();
  const save = useSaveSetting();
  const dismiss = useDismissThresholdSuggestion();
  // Closed for now in this browser tab, without declining them.
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(new Set());
  const [saved, setSaved] = useState<ThresholdPrompt | null>(null);

  const hide = (shown: ThresholdPrompt) => setHiddenKeys((keys) => new Set([...keys, promptKey(shown)]));

  if (saved) {
    const { name } = THRESHOLD_LABELS[saved.kind];
    return (
      <Dialog labelledBy={titleId} onCancel={() => setSaved(null)}>
        <h2 id={titleId} className="text-lg font-semibold">
          {name} updated
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Your {name} is {formatThreshold(saved.kind, saved.suggested)} from {formatDate(saved.date)}.{' '}
          {RECOMPUTED[saved.kind].sentence}
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" autoFocus onClick={() => setSaved(null)} className={PRIMARY_BUTTON}>
            Close
          </button>
        </div>
      </Dialog>
    );
  }

  if (!prompt || hiddenKeys.has(promptKey(prompt))) return null;

  const { name } = THRESHOLD_LABELS[prompt.kind];
  const decline = () => {
    hide(prompt);
    dismiss.mutate({ kind: prompt.kind, activityId: prompt.activityId });
  };
  const accept = () =>
    save.mutate(acceptInput(prompt), {
      onSuccess: () => {
        hide(prompt);
        setSaved(prompt);
      },
    });

  return (
    <Dialog labelledBy={titleId} onCancel={decline}>
      <h2 id={titleId} className="text-lg font-semibold">
        New {name} detected
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        In a recent ride:{' '}
        <Link
          to="/activities/$activityId"
          params={{ activityId: prompt.activityId }}
          onClick={() => hide(prompt)}
          className="font-medium text-ink underline hover:no-underline"
        >
          {rideLabel(prompt)}
        </Link>
      </p>
      <ThresholdChange prompt={prompt} />
      <p className="text-xs text-ink-3">
        {prompt.basis} It applies from {formatDate(prompt.date)}, and {RECOMPUTED[prompt.kind].clause}.
      </p>
      {(save.error || dismiss.error) && <ErrorMessage error={save.error ?? dismiss.error} />}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={decline} disabled={save.isPending} className={SECONDARY_BUTTON}>
          Cancel
        </button>
        <button type="button" autoFocus onClick={accept} disabled={save.isPending} className={PRIMARY_BUTTON}>
          {save.isPending ? 'Saving…' : `Update ${name}`}
        </button>
      </div>
    </Dialog>
  );
};
