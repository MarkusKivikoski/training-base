import { formatThreshold, riseText, type ThresholdPrompt } from '../lib/thresholdPrompt';

type ThresholdChangeProps = {
  prompt: ThresholdPrompt;
};

/** "199 W → 212 W +13 W" in large type, the new value in green. The rise is also in words, not colour alone. */
export const ThresholdChange = ({ prompt }: ThresholdChangeProps) => {
  const rise = riseText(prompt);
  const current = prompt.current === null ? '—' : formatThreshold(prompt.kind, prompt.current);

  return (
    <p className="my-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
      <span className="text-2xl font-semibold text-ink-2">
        <span className="sr-only">From </span>
        {current}
      </span>
      <span aria-hidden className="text-2xl text-ink-3">
        →
      </span>
      <span className="text-3xl font-bold text-status-good">
        <span className="sr-only">to </span>
        {formatThreshold(prompt.kind, prompt.suggested)}
      </span>
      {rise && <span className="text-sm font-medium text-ink-2">{rise}</span>}
    </p>
  );
};
