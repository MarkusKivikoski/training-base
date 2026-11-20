import { RANK_LABELS } from '../../constants';

type RankedValueProps = {
  /** 0 = first place. */
  rank: number;
  value: string;
};

/** "1st 42.3 km/h": the rank and the value, bold for first place. */
export const RankedValue = ({ rank, value }: RankedValueProps) => {
  const weight = rank === 0 ? 'font-semibold' : '';
  return (
    <>
      <span className={`w-7 shrink-0 text-xs text-ink ${weight}`}>{RANK_LABELS[rank]}</span>
      <span className={`tabular-nums text-ink ${weight}`}>{value}</span>
    </>
  );
};
