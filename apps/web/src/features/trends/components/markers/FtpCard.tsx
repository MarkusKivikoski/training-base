import { useMemo } from 'react';
import type { Trends } from '@/shared/api/client';
import { MarkerCard } from '@/shared/charts/markers/MarkerCard';
import { MarkerChart } from '@/shared/charts/markers/MarkerChart';
import type { MarkerSeries } from '@/shared/charts/markers/markerChartOption';
import { POWER_NOTE } from '@/shared/charts/markers/powerNote';
import { formatDate, formatPower } from '@/shared/lib/formatters';
import { ftpRows } from '../../lib/markerRows';

type FtpCardProps = {
  trends: Trends;
};

const NOTES = `Set FTP comes from your tests; eFTP is 95% of your best 20-min power in the previous 90 days. ${POWER_NOTE}`;

/** Set FTP as a step line and the weekly eFTP estimate as a dashed line. */
export const FtpCard = ({ trends }: FtpCardProps) => {
  const { manual, eftp } = trends.ftp;
  const current = manual.at(-1);
  const latestEftp = eftp.at(-1);

  const series = useMemo(
    (): MarkerSeries[] => [
      {
        name: 'FTP (set)',
        slot: '--series-1',
        kind: 'step',
        points: manual.map((entry) => ({ date: entry.from, value: entry.watts, label: entry.note })),
      },
      {
        name: 'eFTP (estimate)',
        slot: '--series-2',
        kind: 'line',
        dashed: true,
        points: eftp.map((estimate) => ({ date: estimate.date, value: estimate.watts })),
      },
    ],
    [manual, eftp],
  );

  const setText = current ? `Set from ${formatDate(current.from)}` : 'npm run settings -- ftp <watts> --from <date>';
  const eftpText = latestEftp ? ` · eFTP ${formatPower(latestEftp.watts)} (estimate, last 90 days)` : '';

  return (
    <MarkerCard
      title="FTP"
      latest={current ? formatPower(current.watts) : 'Not set'}
      latestHint={`${setText}${eftpText}`}
      count={manual.length + eftp.length}
      chart={
        <MarkerChart
          series={series}
          format={formatPower}
          throughDate={trends.today}
          ariaLabel="FTP settings as a step line and weekly eFTP estimate as a dashed line."
        />
      }
      notes={NOTES}
      rows={ftpRows(trends.ftp)}
    />
  );
};
