import { formatPower, formatWattsPerKg } from '@/shared/lib/formatters';
import { scoreBarPercent, scoreText } from '../../lib/profileText';

type ProfileRowProps = {
  label: string;
  wattsPerKg: number;
  watts: number;
  /** 0 = untrained end of the reference range, 1 = world class. */
  score: number;
};

/** One duration of the power profile: its W/kg as a bar between untrained and world class. */
export const ProfileRow = ({ label, wattsPerKg, watts, score }: ProfileRowProps) => (
  <div role="listitem" className="grid grid-cols-[3.5rem_minmax(0,1fr)_7.5rem] items-center gap-3 text-sm">
    <span className="font-medium text-ink">{label}</span>
    <div className="relative h-2.5 rounded-full bg-surface-0" aria-hidden>
      <div className="h-full rounded-full bg-series-1" style={{ width: `${scoreBarPercent(score)}%` }} />
    </div>
    <span className="text-right tabular-nums">
      <span className="font-semibold text-ink">{formatWattsPerKg(wattsPerKg)}</span>
      <span className="text-xs text-ink-3"> · {formatPower(watts)}</span>
      <span className="sr-only">, {scoreText(score)}</span>
    </span>
  </div>
);
