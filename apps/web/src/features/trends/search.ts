import { VOLUME_METRIC_ORDER, type VolumeMetric } from './lib/volumeMetrics';

/**
 * Trends state in the URL: the selected volume measures (`?metrics=hours,distanceKm`; hours
 * alone is the default and stays out) and `?gym=1` to add gym workouts to year over year.
 */
export type TrendsSearch = { metrics?: string; gym?: 1 };

const METRIC_LIST = /^[a-zA-Z,]+$/;

/** The router's `validateSearch` for /trends. */
export const validateTrendsSearch = (search: Record<string, unknown>): TrendsSearch => {
  const out: TrendsSearch = {};
  const metrics = search['metrics'];
  if (typeof metrics === 'string' && METRIC_LIST.test(metrics)) out.metrics = metrics;
  const gym = search['gym'];
  if (gym === 1 || gym === '1' || gym === true) out.gym = 1;
  return out;
};

/** The selected measures from the `metrics` param, in display order; hours when none are valid. */
export const parseMetrics = (value: string | undefined): VolumeMetric[] => {
  const picked = value ? value.split(',') : [];
  const valid = VOLUME_METRIC_ORDER.filter((metric) => picked.includes(metric));
  return valid.length > 0 ? valid : ['hours'];
};

/** The search for these measures and the gym setting, leaving out the defaults. */
export const trendsSearch = (metrics: readonly VolumeMetric[], gym: boolean): TrendsSearch => {
  const out: TrendsSearch = {};
  const isDefaultMetrics = metrics.length === 1 && metrics[0] === 'hours';
  if (!isDefaultMetrics) out.metrics = metrics.join(',');
  if (gym) out.gym = 1;
  return out;
};
