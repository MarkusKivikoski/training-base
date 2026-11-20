import type { TimeRange } from '@app/metrics';
import type { ECharts } from 'echarts/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { Toggle } from '@/shared/ui/Toggle';
import { MinuteTable } from './MinuteTable';
import { rideChartOption } from './rideChartOption';
import { CHART_TOP, chartHeight, PANEL_HEIGHT, visiblePanels } from './ridePanels';

type View = 'chart' | 'table';

const VIEW_OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

const NO_RANGES: readonly TimeRange[] = [];

type RideChartsProps = {
  stream: ActivityStreams;
  showPower: boolean;
  /** Seconds into the ride under the crosshair, or null when the pointer leaves. */
  onHoverTime?: ((seconds: number | null) => void) | undefined;
  /** Shows the crosshair and tooltip at this time (e.g. from hovering the route map). */
  highlightTime?: number | null | undefined;
  /** Work intervals to shade on the power panel (seconds since the start). */
  intervals?: readonly TimeRange[] | undefined;
  /** Climbs to shade on the elevation panel. */
  climbs?: readonly TimeRange[] | undefined;
  /** Time not recorded between the recordings of a merged ride, shaded on every panel. */
  recordingGaps?: readonly TimeRange[] | undefined;
};

/** Power, heart rate, cadence, speed and elevation stacked on one time axis, or as a minute table. */
export const RideCharts = ({
  stream,
  showPower,
  onHoverTime,
  highlightTime = null,
  intervals = NO_RANGES,
  climbs = NO_RANGES,
  recordingGaps = NO_RANGES,
}: RideChartsProps) => {
  const colorScheme = useColorScheme();
  const [view, setView] = useState<View>('chart');
  const chart = useRef<ECharts | null>(null);
  const setInstance = useCallback((instance: ECharts | null) => {
    chart.current = instance;
  }, []);

  // Follow the map: show the tooltip at the hovered time.
  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;
    if (highlightTime === null) {
      instance.dispatchAction({ type: 'hideTip' });
      return;
    }
    const x = instance.convertToPixel({ xAxisIndex: 0 }, highlightTime);
    if (Number.isFinite(x)) instance.dispatchAction({ type: 'showTip', x, y: CHART_TOP + PANEL_HEIGHT / 2 });
  }, [highlightTime]);

  const panels = useMemo(() => visiblePanels(stream, showPower), [stream, showPower]);

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => rideChartOption({ stream, panels, intervals, climbs, recordingGaps }),
    [stream, panels, intervals, climbs, recordingGaps, colorScheme],
  );

  if (panels.length === 0) return <p className="text-sm text-ink-3">No sensor data recorded.</p>;

  const panelNames = panels.map((panel) => panel.title).join(', ');

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3">Drag the slider handles to zoom, the middle to pan · hover for values</p>
        <Toggle label="Ride chart view" value={view} onChange={setView} options={VIEW_OPTIONS} />
      </div>
      {view === 'chart' ? (
        <EChart
          option={option}
          className=""
          style={{ height: chartHeight(panels.length) }}
          onAxisHover={onHoverTime}
          instanceRef={setInstance}
          ariaLabel={`Ride charts: ${panelNames} over time. Switch to the table view for values.`}
        />
      ) : (
        <MinuteTable stream={stream} panels={panels} />
      )}
    </div>
  );
};
