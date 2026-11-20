import type { CriticalPower } from '@app/metrics';
import { formatPower, formatWattsPerKg } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { InfoTip } from '@/shared/ui/InfoTip';
import { durationsText, fitText, formatWPrime, versusFtpText } from '../../lib/criticalPowerText';

type CriticalPowerCardProps = {
  model: CriticalPower | null;
  rangeLabel: string;
  ftp: number | null;
  /** Today's weight, for CP in W/kg. */
  kg: number | null;
};

const CP_EXPLANATION =
  'Critical power is the highest power you can hold for a long time without tiring quickly, usually 30 to 60 minutes. Above it you spend W′ (W prime): a limited store of extra work that refills when you ride below CP. Both come from a model fitted to your best 2-, 5-, 10- and 20-minute efforts, so they’re only as good as those efforts.';

/** Critical power and W′ from the range's best efforts, with how well the model fits. */
export const CriticalPowerCard = ({ model, rangeLabel, ftp, kg }: CriticalPowerCardProps) => (
  <Card
    title={
      <span className="inline-flex items-center gap-1.5">
        Critical power · {rangeLabel}
        <InfoTip label="Critical power">{CP_EXPLANATION}</InfoTip>
      </span>
    }
    className="mt-4"
  >
    {model ? (
      <CriticalPowerValues model={model} ftp={ftp} kg={kg} />
    ) : (
      <p className="text-sm text-ink-3">
        Needs best efforts at three or more of 2, 5, 10 and 20 minutes in this range, and they have to fall off with
        duration the way real all-out efforts do.
      </p>
    )}
  </Card>
);

type CriticalPowerValuesProps = {
  model: CriticalPower;
  ftp: number | null;
  kg: number | null;
};

const CriticalPowerValues = ({ model, ftp, kg }: CriticalPowerValuesProps) => {
  const cpWatts = Math.round(model.cp);
  const versusFtp = versusFtpText(model.cp, ftp);

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-2">Critical power (CP)</dt>
          <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatPower(cpWatts)}</dd>
          {kg && <dd className="text-xs text-ink-3">{formatWattsPerKg(model.cp / kg)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-ink-2">W′ (work above CP)</dt>
          <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{formatWPrime(model.wPrimeJ)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Model fit</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{fitText(model.rSquared)}</dd>
          <dd className="text-xs text-ink-3">R² {model.rSquared.toFixed(3)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-3">
        {versusFtp ? `${versusFtp}. ` : ''}Fitted to your {durationsText(model.durationsS)} bests; dashed on the chart
        above (in the W view). An estimate from a two-parameter model, not a test result.
      </p>
    </>
  );
};
