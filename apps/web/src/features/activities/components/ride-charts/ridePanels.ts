import type { ActivityStreams } from '@/shared/api/client';

export type ChannelKey = 'power' | 'hr' | 'cadence' | 'speed' | 'altitude';

export type RidePanel = {
  key: ChannelKey;
  title: string;
  unit: string;
  /** CSS variable of the series colour. */
  slot: string;
  /** Multiplier from the stream's unit to the shown one (m/s → km/h). */
  scale?: number;
  digits: number;
};

/**
 * One panel per channel. Each channel keeps a fixed series slot (color follows the
 * entity, never its rank), and each panel has a visible text title, so identity never
 * relies on color alone.
 */
export const RIDE_PANELS: readonly RidePanel[] = [
  { key: 'power', title: 'Power', unit: 'W', slot: '--series-1', digits: 0 },
  { key: 'hr', title: 'Heart rate', unit: 'bpm', slot: '--series-2', digits: 0 },
  { key: 'cadence', title: 'Cadence', unit: 'rpm', slot: '--series-3', digits: 0 },
  { key: 'speed', title: 'Speed', unit: 'km/h', slot: '--series-4', scale: 3.6, digits: 1 },
  { key: 'altitude', title: 'Elevation', unit: 'm', slot: '--series-5', digits: 0 },
];

/** Chart layout in pixels. */
export const PANEL_HEIGHT = 96;
export const PANEL_GAP = 34;
export const CHART_TOP = 24;
export const SLIDER_SPACE = 52;

/** Total chart height for this many panels. */
export const chartHeight = (panelCount: number) =>
  CHART_TOP + panelCount * (PANEL_HEIGHT + PANEL_GAP) + SLIDER_SPACE - PANEL_GAP;

/** The panels with data on this ride; power only when the ride has a power meter. */
export const visiblePanels = (stream: ActivityStreams, showPower: boolean): RidePanel[] =>
  RIDE_PANELS.filter((panel) => {
    const values = stream[panel.key];
    const hasData = Boolean(values?.some((value) => value !== null && value > 0));
    if (!hasData) return false;
    return panel.key !== 'power' || showPower;
  });
