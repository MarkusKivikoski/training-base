import { useMemo, useState } from 'react';
import type { PlannedEvent } from '@/shared/api/client';
import { EChart } from '@/shared/charts/EChart';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { Toggle } from '@/shared/ui/Toggle';
import { CHART_VIEW_OPTIONS, type ChartView } from '../../constants';
import type { FitnessRow } from '../../lib/fitnessRows';
import { buildFitnessChartOption, formZoneWashes } from './fitnessChartOption';
import { FitnessTable } from './FitnessTable';

type FitnessChartProps = {
  rows: FitnessRow[];
  /** Today's date, where the "Today" line goes when there is a forecast. */
  todayDate: string;
  /** Target events, marked on the chart when they fall in it. */
  events: readonly PlannedEvent[];
};

/**
 * Fitness, fatigue and form over time, with translucent zone bands (none in the baseline period),
 * and a table view.
 */
export const FitnessChart = ({ rows, todayDate, events }: FitnessChartProps) => {
  const scheme = useColorScheme();
  const [view, setView] = useState<ChartView>('chart');
  const hasBands = rows.some((row) => row.bands !== null);

  // `scheme` re-reads the colour tokens when the theme changes.
  const option = useMemo(
    () => buildFitnessChartOption(rows, hasBands, todayDate, events),
    [rows, hasBands, todayDate, events, scheme],
  );
  const visibleWashes = useMemo(() => formZoneWashes().filter((wash) => wash.opacity > 0), [scheme]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Toggle label="Fitness chart view" value={view} onChange={setView} options={CHART_VIEW_OPTIONS} />
      </div>
      {view === 'table' && <FitnessTable rows={rows} />}
      {view === 'chart' && (
        <>
          <EChart
            option={option}
            className="h-80"
            ariaLabel="Fitness (CTL) and fatigue (ATL) lines with a safe-fatigue band, and form (TSB) bars over form zones. Switch to the table view for values and zones."
          />
          {hasBands && (
            <ul
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2"
              aria-label="Form zones (lower chart)"
            >
              <li className="text-ink-3">Form zones:</li>
              {visibleWashes.map((wash) => (
                <li key={wash.name} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: wash.color, opacity: Math.min(1, wash.opacity * 4) }}
                  />
                  {wash.name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
