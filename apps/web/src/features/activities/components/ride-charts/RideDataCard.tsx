import type { TimeRange } from '@app/metrics';
import type { ActivityStreams } from '@/shared/api/client';
import { Card } from '@/shared/ui/Card';
import { Loading } from '@/shared/ui/Loading';
import type { DraftMark } from '../../lib/intervalEdits';
import { RideCharts } from './RideCharts';

type RideDataCardProps = {
  stream: ActivityStreams | undefined;
  isPending: boolean;
  hasError: boolean;
  showPower: boolean;
  onHoverTime: (seconds: number | null) => void;
  highlightTime: number | null;
  intervals: readonly TimeRange[];
  climbs: readonly TimeRange[];
  /** Time not recorded between the recordings of a merged ride. */
  recordingGaps: readonly TimeRange[];
  /** The interval being added or trimmed. */
  draftInterval: DraftMark | null;
  /** While an interval is being added or trimmed: a click on the chart picks a time for it. */
  onPickTime: ((seconds: number) => void) | undefined;
};

/** The per-second ride charts, or why there are none. */
export const RideDataCard = ({ stream, isPending, hasError, ...chartProps }: RideDataCardProps) => (
  <Card title="Ride data" className="lg:col-span-3">
    <RideDataBody stream={stream} isPending={isPending} hasError={hasError} {...chartProps} />
  </Card>
);

const RideDataBody = ({ stream, isPending, hasError, ...chartProps }: RideDataCardProps) => {
  if (isPending) return <Loading />;
  if (hasError || !stream) {
    return (
      <p className="text-sm text-ink-3">
        No per-second data for this activity yet. Run <code>npm run rebuild</code> after syncing its FIT file.
      </p>
    );
  }
  return <RideCharts stream={stream} {...chartProps} />;
};
