import { MEDAL_BG } from '@/shared/ui/medals';
import type { RecordEntry } from '../../types';
import { RankedValue } from './RankedValue';
import { RideLink } from './RideLink';

type PodiumPlaceProps = {
  /** 0 = first place. */
  rank: number;
  entry: RecordEntry;
  value: string;
  /** Shown before the ride link, e.g. the average speed. */
  detail?: string | null | undefined;
};

/** One podium place: rank and value, then the detail and the ride's date (linked). */
export const PodiumPlace = ({ rank, entry, value, detail }: PodiumPlaceProps) => (
  <div className={`min-w-0 rounded-md px-2 py-1 ${MEDAL_BG[rank]}`}>
    <div className="flex items-baseline gap-2">
      <RankedValue rank={rank} value={value} />
    </div>
    <div className="truncate pl-9 text-xs text-ink-2">
      {detail && <span>{detail} · </span>}
      <RideLink entry={entry} />
    </div>
  </div>
);
