import type { CriticalPower, CurvePoint } from '@app/metrics';
import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';
import type { ComparePreset, Preset } from '../../constants';
import type { KgForDate } from '../../lib/curveValues';
import { compareLabel, curveCardTitle, presetLabel } from '../../lib/ranges';
import { CurveChart } from './CurveChart';
import { CurveTable } from './CurveTable';

type View = 'chart' | 'table';
type Unit = 'w' | 'wkg';

const VIEW_OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];
const UNIT_OPTIONS: ReadonlyArray<{ value: Unit; label: string }> = [
  { value: 'w', label: 'W' },
  { value: 'wkg', label: 'W/kg' },
];

type CurveCardProps = {
  primary: Preset;
  compare: ComparePreset;
  primaryCurve: CurvePoint[];
  compareCurve: CurvePoint[];
  kgFor: KgForDate;
  model: CriticalPower | null;
  hasWeight: boolean;
  rideCount: number | undefined;
  isPending: boolean;
  error: Error | null;
};

/** The power curve card: chart or table, in W or W/kg, with how many rides it covers. */
export const CurveCard = ({ primary, compare, hasWeight, rideCount, isPending, error, ...curves }: CurveCardProps) => {
  const [view, setView] = useState<View>('chart');
  const [unit, setUnit] = useState<Unit>('w');

  const rideCountText = rideCount === undefined ? '' : `${rideCount} rides with power in range. `;
  const weightText = hasWeight
    ? 'W/kg uses your weight on each ride’s date (your earliest entry applies before it).'
    : 'Add your weight for W/kg: npm run settings -- weight <kg>.';

  return (
    <Card
      title={curveCardTitle(primary, compare)}
      action={
        <div className="flex flex-wrap gap-2">
          {hasWeight && <Toggle label="Power unit" value={unit} onChange={setUnit} options={UNIT_OPTIONS} />}
          <Toggle label="Power curve view" value={view} onChange={setView} options={VIEW_OPTIONS} />
        </div>
      }
    >
      <CurveBody
        {...curves}
        view={view}
        perKg={unit === 'wkg' && hasWeight}
        primaryLabel={presetLabel(primary)}
        compareLabel={compareLabel(compare)}
        isPending={isPending}
        error={error}
      />
      <p className="mt-3 text-xs text-ink-3">
        {rideCountText}
        {weightText}
      </p>
    </Card>
  );
};

type CurveBodyProps = {
  primaryCurve: CurvePoint[];
  compareCurve: CurvePoint[];
  kgFor: KgForDate;
  model: CriticalPower | null;
  view: View;
  perKg: boolean;
  primaryLabel: string;
  compareLabel: string | null;
  isPending: boolean;
  error: Error | null;
};

const CurveBody = ({
  primaryCurve,
  compareCurve,
  kgFor,
  model,
  view,
  perKg,
  isPending,
  error,
  ...labels
}: CurveBodyProps) => {
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (primaryCurve.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        No rides with power in this range. Only rides recorded with a power meter (currently your indoor rides) have a
        power curve.
      </p>
    );
  }
  if (view === 'table') {
    return (
      <CurveTable primary={primaryCurve} compare={compareCurve} compareLabel={labels.compareLabel} kgFor={kgFor} />
    );
  }
  return (
    <CurveChart primary={primaryCurve} compare={compareCurve} kgFor={kgFor} perKg={perKg} model={model} {...labels} />
  );
};
