import type { CriticalPower, CurvePoint } from '@app/metrics';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import type { KgForDate } from '../../lib/curveValues';
import { curveChartOption } from './curveChartOption';

type CurveChartProps = {
  primary: CurvePoint[];
  compare: CurvePoint[];
  primaryLabel: string;
  compareLabel: string | null;
  kgFor: KgForDate;
  /** Plot W/kg (weight on each ride's date) instead of watts. */
  perKg: boolean;
  model: CriticalPower | null;
};

/** The power curve; clicking a point opens the ride it came from. */
export const CurveChart = ({ primary, compare, primaryLabel, compareLabel, kgFor, perKg, model }: CurveChartProps) => {
  const colorScheme = useColorScheme();
  const navigate = useNavigate();
  const curves = useMemo(() => (compareLabel ? [primary, compare] : [primary]), [primary, compare, compareLabel]);
  const names = useMemo(() => [primaryLabel, compareLabel ?? ''], [primaryLabel, compareLabel]);

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => curveChartOption({ curves, names, kgFor, perKg, model }),
    [curves, names, kgFor, perKg, model, colorScheme],
  );

  const comparison = compareLabel ? ` compared with ${compareLabel}` : '';

  return (
    <EChart
      option={option}
      className="h-80"
      ariaLabel={`Power curve for ${primaryLabel}${comparison}. Switch to the table view for values.`}
      onClick={({ seriesIndex, dataIndex }) => {
        const point = curves[seriesIndex]?.[dataIndex];
        if (point) void navigate({ to: '/activities/$activityId', params: { activityId: point.activityId } });
      }}
    />
  );
};
