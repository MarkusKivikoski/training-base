export type ComparePanel = {
  key: 'power' | 'hr' | 'speed' | 'altitude';
  title: string;
  unit: string;
  /** Multiplier from the stream's unit to the shown one (m/s → km/h). */
  scale?: number;
  digits: number;
};

export const COMPARE_PANELS: readonly ComparePanel[] = [
  { key: 'power', title: 'Power', unit: 'W', digits: 0 },
  { key: 'hr', title: 'Heart rate', unit: 'bpm', digits: 0 },
  { key: 'speed', title: 'Speed', unit: 'km/h', scale: 3.6, digits: 1 },
  { key: 'altitude', title: 'Elevation', unit: 'm', digits: 0 },
];

/** Chart layout in pixels. */
export const PANEL_HEIGHT = 110;
export const PANEL_GAP = 36;
export const CHART_TOP = 40;

export const chartHeight = (panelCount: number) => CHART_TOP + panelCount * (PANEL_HEIGHT + PANEL_GAP);
