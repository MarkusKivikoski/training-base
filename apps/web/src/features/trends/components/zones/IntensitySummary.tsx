import { formatHours } from '@/shared/lib/formatters';
import { splitPercent, type IntensitySplit } from '../../lib/zoneTime';
import { channelName, type ZoneChannel } from './zoneTrendTypes';

type IntensitySummaryProps = {
  split: IntensitySplit;
  channel: ZoneChannel;
};

/** "Last 4 weeks (5 h): 80% easy (Z1–2) · 12% moderate (Z3) · 8% hard (Z4+)". */
export const IntensitySummary = ({ split, channel }: IntensitySummaryProps) => {
  if (split.total === 0) {
    return <p className="mb-2 text-sm text-ink-2">No {channelName(channel)} zone data in the last 4 weeks.</p>;
  }

  return (
    <p className="mb-2 text-sm text-ink-2">
      Last 4 weeks ({formatHours(split.total)}): <b className="text-ink">{splitPercent(split, split.easy)}% easy</b>{' '}
      (Z1–2) · <b className="text-ink">{splitPercent(split, split.moderate)}% moderate</b> (Z3) ·{' '}
      <b className="text-ink">{splitPercent(split, split.hard)}% hard</b> (Z4+)
    </p>
  );
};
