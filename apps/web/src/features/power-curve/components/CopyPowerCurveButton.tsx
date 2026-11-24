import type { Trends } from '@/shared/api/client';
import { CopyButton } from '@/shared/ui/CopyButton';
import type { ComparePreset, Preset } from '../constants';
import type { PowerCurves } from '../hooks/usePowerCurves';
import { powerCurveCoachText } from '../lib/coachText';

type CopyPowerCurveButtonProps = {
  today: string | undefined;
  primary: Preset;
  compare: ComparePreset;
  curves: PowerCurves;
  /** Weekly VO₂ max estimates; the latest goes in the text. */
  vo2max: Trends['vo2max'] | undefined;
};

/** Copies the best power curve, rider profile, critical power and VO₂ max as Markdown for a coaching chat. */
export const CopyPowerCurveButton = ({ today, primary, compare, curves, vo2max }: CopyPowerCurveButtonProps) => {
  const hasCurve = curves.primaryCurve.length > 0;
  const isReady = today !== undefined && hasCurve && !curves.isComparePending;

  const getText = () => {
    // The button is disabled until there's a date; this only satisfies the type.
    if (today === undefined) return '';
    return powerCurveCoachText({
      today,
      primary,
      compare,
      primaryCurve: curves.primaryCurve,
      compareCurve: curves.compareCurve,
      kgFor: curves.kgFor,
      rideCount: curves.rideCount,
      model: curves.model,
      ftp: curves.ftp,
      kgToday: curves.kgToday,
      vo2max: vo2max?.at(-1) ?? null,
    });
  };

  return (
    <CopyButton
      getText={getText}
      label="Copy for coach"
      dialogTitle="Copy for coach"
      title="Copy the power curve, rider profile, critical power and VO₂ max for a coaching chat"
      disabled={!isReady}
    />
  );
};
