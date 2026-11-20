import { addDays } from '@app/metrics';
import { PRESETS, type ComparePreset, type Preset } from '../constants';

export type DateRange = { from?: string; to: string };

/** The dates a preset covers, ending today. "All time" has no start. */
export const rangeFor = (preset: Preset, today: string): DateRange => {
  switch (preset) {
    case 'last42':
      return { from: addDays(today, -41), to: today };
    case 'last90':
      return { from: addDays(today, -89), to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'all':
      return { to: today };
  }
};

export const presetLabel = (preset: Preset): string => PRESETS.find((option) => option.value === preset)!.label;

/** The comparison range's label, or null when there's none. */
export const compareLabel = (preset: ComparePreset): string | null => (preset === 'none' ? null : presetLabel(preset));

/** "Best power · Last 90 days", or "… vs All time" with a comparison. */
export const curveCardTitle = (primary: Preset, compare: ComparePreset): string => {
  const title = `Best power · ${presetLabel(primary)}`;
  const other = compareLabel(compare);
  return other ? `${title} vs ${other}` : title;
};
