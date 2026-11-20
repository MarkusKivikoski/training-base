import { useMemo } from 'react';
import { useColorScheme } from '../chartTheme';
import { EChart } from '../EChart';
import { markerChartOption, type MarkerSeries } from './markerChartOption';

type MarkerChartProps = {
  series: readonly MarkerSeries[];
  format: (value: number) => string;
  /** Step lines and the axis run to this date (usually today). */
  throughDate: string;
  ariaLabel: string;
};

/**
 * A fitness marker over time on a date axis: per-ride points, a step line for settings
 * (FTP entries), or a line for a sampled estimate (eFTP). One y-axis; legend when there is
 * more than one series.
 */
export const MarkerChart = ({ series, format, throughDate, ariaLabel }: MarkerChartProps) => {
  const colorScheme = useColorScheme();

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => markerChartOption({ series, format, throughDate }),
    [series, format, throughDate, colorScheme],
  );

  return <EChart option={option} className="h-56" ariaLabel={ariaLabel} />;
};
