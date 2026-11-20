import { useState } from 'react';
import { useStatus } from '@/shared/api/status';
import { useTrends } from '@/shared/api/trends';
import { Vo2maxCard } from '@/shared/charts/markers/Vo2maxCard';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { CriticalPowerCard } from './components/cp/CriticalPowerCard';
import { CurveCard } from './components/curve/CurveCard';
import { RiderProfileCard } from './components/profile/RiderProfileCard';
import { RangeSelect } from './components/RangeSelect';
import { DEFAULT_PRESET, type ComparePreset, type Preset } from './constants';
import { usePowerCurves } from './hooks/usePowerCurves';
import { presetLabel } from './lib/ranges';

/** Best power by duration for a range (optionally against another), the rider profile, critical power and VO₂ max. */
export const PowerCurvePage = () => {
  const status = useStatus();
  const trends = useTrends();
  const today = status.data?.today;
  const [primary, setPrimary] = useState<Preset>(DEFAULT_PRESET);
  const [compare, setCompare] = useState<ComparePreset>('none');
  const curves = usePowerCurves(today, primary, compare);

  if (status.error) return <ErrorMessage error={status.error} />;

  const showsProfile = today !== undefined && curves.primaryCurve.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Power Curve & VO₂ max</h1>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <RangeSelect label="Range" value={primary} onChange={setPrimary} />
        <RangeSelect label="Compare with" value={compare} onChange={setCompare} allowNone />
      </div>

      <CurveCard
        primary={primary}
        compare={compare}
        primaryCurve={curves.primaryCurve}
        compareCurve={curves.compareCurve}
        kgFor={curves.kgFor}
        model={curves.model}
        hasWeight={curves.hasWeight}
        rideCount={curves.rideCount}
        isPending={curves.isPending}
        error={curves.error}
      />

      {showsProfile && (
        <>
          <RiderProfileCard
            curve={curves.primaryCurve}
            kgFor={curves.kgFor}
            rangeLabel={presetLabel(primary)}
            hasWeight={curves.hasWeight}
          />
          <CriticalPowerCard
            model={curves.model}
            rangeLabel={presetLabel(primary)}
            ftp={curves.ftp}
            kg={curves.kgToday}
          />
        </>
      )}

      {/* The VO₂ max estimate comes from the 5-min point of this same curve (rolling 90 days). */}
      {trends.data && <Vo2maxCard points={trends.data.vo2max} today={trends.data.today} className="mt-4" />}
    </div>
  );
};
