import { MEAN_MAX_DURATIONS_S } from '@app/metrics';
import type { Activity } from '@/shared/api/client';
import {
  formatDate,
  formatDurationLabel,
  formatIntensityFactor,
  formatPower,
  formatTss,
} from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { BEST_EFFORTS_S } from '../../constants';
import { Stat } from './Stat';

type PowerCardProps = {
  activity: Activity;
  /** Date of the first FTP entry, for the hint when this ride has no FTP. */
  firstFtp: string | null;
};

const bestEffortWatts = (activity: Activity, durationS: number) => {
  const index = MEAN_MAX_DURATIONS_S.indexOf(durationS as (typeof MEAN_MAX_DURATIONS_S)[number]);
  return activity.meanMaxPower?.[index] ?? null;
};

/** Average power, NP, IF and power TSS, the FTP behind them, and a few best efforts. */
export const PowerCard = ({ activity, firstFtp }: PowerCardProps) => {
  const { metrics } = activity;
  const firstFtpHint = firstFtp
    ? ` Your first FTP entry is ${formatDate(firstFtp)}.`
    : ' Add one with npm run settings.';

  return (
    <Card title="Power">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Stat label="Avg power" value={formatPower(activity.avgPower)} />
        <Stat label="NP" value={formatPower(metrics?.np)} />
        <Stat label="IF" value={formatIntensityFactor(metrics?.intensityFactor)} />
        <Stat label="TSS · power" value={formatTss(metrics?.tss)} />
      </dl>
      {metrics?.ftpUsed ? (
        <p className="mt-2 text-xs text-ink-3">Using FTP {formatPower(metrics.ftpUsed)}.</p>
      ) : (
        <p className="mt-2 text-xs text-ink-3">
          No FTP set for this date, so there’s no IF or TSS.
          {firstFtpHint}
        </p>
      )}

      <h3 className="mb-2 mt-4 text-xs font-medium text-ink-2">Best efforts</h3>
      <dl className="grid grid-cols-4 gap-2">
        {BEST_EFFORTS_S.map((durationS) => (
          <div key={durationS}>
            <dt className="text-xs text-ink-3">{formatDurationLabel(durationS)}</dt>
            <dd className="text-sm font-semibold">{formatPower(bestEffortWatts(activity, durationS))}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};
