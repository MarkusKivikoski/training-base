/** One panel of the past-efforts chart: a measure with its own y-axis. */
export type EffortPanel = {
  title: string;
  unit: string;
  /** CSS variable of the series colour. */
  slot: string;
};

/** One effort on the past-efforts chart. */
export type EffortChartPoint = {
  date: string;
  /** The ride being viewed; drawn larger. */
  isCurrent: boolean;
  /** One value per panel, in panel order; null leaves the effort out of that panel. */
  values: ReadonlyArray<number | null>;
  /** Tooltip text (HTML). */
  tooltip: string;
};
