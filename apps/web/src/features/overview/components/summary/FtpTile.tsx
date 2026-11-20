import { wattsPerKg } from '@app/metrics';
import { StatTile } from '@/shared/ui/StatTile';
import { formatDate, formatPower, formatWattsPerKg } from '@/shared/lib/formatters';

type FtpTileProps = {
  ftp: { watts: number; from: string } | null;
  weightKg: number | null;
  /** eFTP from the last 90 days, or null without enough power data. */
  estimatedFtp: number | null;
};

/** The FTP in effect, its W/kg and start date, and the eFTP estimate. */
export const FtpTile = ({ ftp, weightKg, estimatedFtp }: FtpTileProps) => {
  const wkg = wattsPerKg(ftp?.watts, weightKg);
  const wkgText = wkg ? formatWattsPerKg(wkg) : 'Add weight for W/kg';
  const ftpHint = ftp ? `${wkgText} · since ${formatDate(ftp.from)}` : 'Set it on the Settings page';

  return (
    <StatTile
      label="FTP"
      value={ftp ? formatPower(ftp.watts) : 'Not set'}
      hint={
        <>
          {ftpHint}
          {estimatedFtp !== null && (
            <span className="block">eFTP {formatPower(estimatedFtp)} (estimate, last 90 days)</span>
          )}
        </>
      }
    />
  );
};
