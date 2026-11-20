import { useMemo } from 'react';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import type { EffortChartPoint, EffortPanel } from '../../lib/effortChart';
import { pastEffortsChartHeightPx, pastEffortsChartOption } from './pastEffortsChartOption';

type PastEffortsChartProps = {
  panels: readonly EffortPanel[];
  /** Oldest first. */
  points: readonly EffortChartPoint[];
  ariaLabel: string;
};

/** Every effort on a workout or route by date, one panel per measure. */
export const PastEffortsChart = ({ panels, points, ariaLabel }: PastEffortsChartProps) => {
  const colorScheme = useColorScheme();
  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(() => pastEffortsChartOption(panels, points), [panels, points, colorScheme]);

  return (
    <EChart
      option={option}
      className=""
      style={{ height: pastEffortsChartHeightPx(panels.length) }}
      ariaLabel={ariaLabel}
    />
  );
};
