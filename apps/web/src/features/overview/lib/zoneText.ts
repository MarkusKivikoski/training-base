import type { DayStatus, LoadZone } from '@app/metrics';
import { formatLoad } from '@/shared/lib/formatters';

/** "+12%", "−3%", "0%". */
export const formatSignedPercent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value)}%`;

/** "1.05×". */
export const formatRatio = (value: number) => `${value.toFixed(2)}×`;

/** A zone's range in words: "below 0.8×", "1.5× and up", "0.8× to 1.3×". */
export const zoneRangeInWords = (zone: LoadZone, format: (value: number) => string): string => {
  if (zone.min === null) return `below ${format(zone.max!)}`;
  if (zone.max === null) return `${format(zone.min)} and up`;
  return `${format(zone.min)} to ${format(zone.max)}`;
};

/** A zone's range in symbols: "< 0.8", "≥ 1.6", "0.8–1.2". */
export const zoneRangeInSymbols = (zone: LoadZone): string => {
  if (zone.min === null) return `< ${zone.max}`;
  if (zone.max === null) return `≥ ${zone.min}`;
  return `${zone.min}–${zone.max}`;
};

/** One day's zones for a table cell: "Form +12% Fresh · Fatigue 1.05× Optimal training". */
export const describeDayZones = (status: DayStatus): string => {
  if (status.form.baseline) return 'Building baseline';
  const form = `Form ${formatSignedPercent(status.form.value)} ${status.form.zone.label}`;
  if (status.fatigue.baseline) return form;
  return `${form} · Fatigue ${formatRatio(status.fatigue.value)} ${status.fatigue.zone.label}`;
};

/** One day's zones as tooltip lines (HTML), empty lines left out. */
export const describeDayZoneLines = (status: DayStatus): string[] => {
  if (status.form.baseline) return ['<span style="opacity:.7">Zones: building baseline</span>'];
  const lines = [`Form ${formatSignedPercent(status.form.value)} of fitness · <b>${status.form.zone.label}</b>`];
  if (!status.fatigue.baseline) {
    lines.push(`Fatigue ${formatRatio(status.fatigue.value)} fitness · <b>${status.fatigue.zone.label}</b>`);
  }
  if (!status.fitness.baseline) {
    lines.push(`Fitness ${formatLoad(status.fitness.value, true)} in 7 days · <b>${status.fitness.zone.label}</b>`);
  }
  return lines;
};
