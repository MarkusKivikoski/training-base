import type { Activity } from '@/shared/api/client';
import {
  DECOUPLING_EXPLANATION,
  decouplingBasisLabel,
  decouplingVerdict,
  formatDecoupling,
} from '@/shared/lib/decoupling';
import { InfoTip } from '@/shared/ui/InfoTip';

type DecouplingStatProps = {
  decoupling: Activity['decoupling'];
  /** Why there's no value, shown instead of one. */
  missingReason: string | null;
};

/** Aerobic decoupling in the stats grid, with what it compared and an explanation, or why it's missing. */
export const DecouplingStat = ({ decoupling, missingReason }: DecouplingStatProps) => (
  <div>
    <dt className="flex items-center gap-1.5 text-xs text-ink-2">
      Aerobic decoupling
      <InfoTip label="Aerobic decoupling">{DECOUPLING_EXPLANATION}</InfoTip>
    </dt>
    <dd className="mt-0.5 text-lg font-semibold text-ink">{decoupling ? formatDecoupling(decoupling.percent) : '—'}</dd>
    <dd className="text-xs text-ink-3">
      {decoupling
        ? `${decouplingVerdict(decoupling.percent)} · ${decouplingBasisLabel(decoupling.basis)}`
        : missingReason}
    </dd>
  </div>
);
