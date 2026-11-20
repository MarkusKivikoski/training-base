import { useMemo } from 'react';
import type { ClimbDetail } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { effortHistoryChartOption } from './effortHistoryChartOption';

type EffortHistoryChartProps = {
  climb: ClimbDetail;
};

/** Times on the climb over the years. */
export const EffortHistoryChart = ({ climb }: EffortHistoryChartProps) => {
  const colorScheme = useColorScheme();
  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(() => effortHistoryChartOption(climb), [climb, colorScheme]);

  return (
    <EChart
      option={option}
      className="h-56"
      ariaLabel={`Times on this climb by date, ${climb.efforts.length} efforts. The table below lists them.`}
    />
  );
};
