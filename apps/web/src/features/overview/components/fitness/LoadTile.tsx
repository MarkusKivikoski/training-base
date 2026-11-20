import type { ReactNode } from 'react';
import { formatLoad } from '@/shared/lib/formatters';
import { InfoTip } from '@/shared/ui/InfoTip';

type LoadTileProps = {
  label: string;
  value: number | undefined;
  /** Change since 7 days ago; null when there's no day to compare with. */
  changeSinceWeekAgo: number | null;
  /** Show a + sign for positive values (form). */
  signed?: boolean;
  /** What the value means, shown in a tooltip next to the label. */
  explanation?: string | undefined;
  /** The status chip under the value. */
  children?: ReactNode;
};

/** One of the fitness, fatigue and form values, with its 7-day change and status. */
export const LoadTile = ({
  label,
  value,
  changeSinceWeekAgo,
  signed = false,
  explanation,
  children,
}: LoadTileProps) => {
  const changeText = changeSinceWeekAgo === null ? 'today' : `${formatLoad(changeSinceWeekAgo, true)} vs 7 days ago`;

  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-ink-2">
        {label}
        {explanation && <InfoTip label={label}>{explanation}</InfoTip>}
      </dt>
      <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatLoad(value, signed)}</dd>
      <dd className="text-xs text-ink-3">{changeText}</dd>
      {children && <dd className="mt-1">{children}</dd>}
    </div>
  );
};
