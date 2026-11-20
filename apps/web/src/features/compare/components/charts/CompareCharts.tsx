import { useMemo } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { canAlignByDistance, hasChannelData } from '../../lib/alignedPoints';
import { compareChartOption } from './compareChartOption';
import { chartHeight, COMPARE_PANELS } from './comparePanels';

type CompareChartsProps = {
  a: ActivityStreams;
  b: ActivityStreams;
  /** Legend names of ride A and ride B. */
  labels: readonly [string, string];
};

/**
 * Two rides overlaid, one panel per channel (each its own y-axis), sharing an x-axis: distance
 * (km) when both rides have it, so the same route lines up; otherwise elapsed time.
 */
export const CompareCharts = ({ a, b, labels }: CompareChartsProps) => {
  const colorScheme = useColorScheme();
  const byDistance = canAlignByDistance(a, b);
  const panels = useMemo(
    () => COMPARE_PANELS.filter((panel) => hasChannelData(a, panel.key) || hasChannelData(b, panel.key)),
    [a, b],
  );

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => compareChartOption({ a, b, labels, panels, byDistance }),
    [a, b, labels, panels, byDistance, colorScheme],
  );

  if (panels.length === 0) return <p className="text-sm text-ink-3">Neither ride has sensor data to compare.</p>;

  const alignment = byDistance ? 'distance' : 'time';
  const panelNames = panels.map((panel) => panel.title).join(', ');

  return (
    <div>
      <p className="mb-1 text-xs text-ink-3">
        {byDistance
          ? 'Aligned by distance, so the same route lines up.'
          : 'Aligned by elapsed time (one of the rides has no distance).'}
      </p>
      <EChart
        option={option}
        className=""
        style={{ height: chartHeight(panels.length) }}
        ariaLabel={`Two rides overlaid by ${alignment}: ${panelNames}. The table above lists the totals.`}
      />
    </div>
  );
};
