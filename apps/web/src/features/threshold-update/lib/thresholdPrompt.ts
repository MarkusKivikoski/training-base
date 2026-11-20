import type { FtpSuggestion, LthrSuggestion } from '@app/metrics';
import type { SaveSettingInput } from '@/shared/api/settings';
import { formatDate } from '@/shared/lib/formatters';

export type ThresholdKind = 'ftp' | 'lthr';

/** One suggested threshold update, the same shape for FTP and LTHR. */
export type ThresholdPrompt = {
  kind: ThresholdKind;
  activityId: string;
  name: string | undefined;
  /** The ride's date; the new value applies from it. */
  date: string;
  current: number | null;
  suggested: number;
  /** How the new value was worked out. */
  basis: string;
  /** The note saved with the new entry. */
  note: string;
};

export const THRESHOLD_LABELS: Record<ThresholdKind, { name: string; unit: string }> = {
  ftp: { name: 'FTP', unit: 'W' },
  lthr: { name: 'LTHR', unit: 'bpm' },
};

const rideSuffix = (name: string | undefined) => (name ? ` in ${name}` : '');

export const ftpPrompt = (suggestion: FtpSuggestion): ThresholdPrompt => ({
  kind: 'ftp',
  activityId: suggestion.activityId,
  name: suggestion.name,
  date: suggestion.date,
  current: suggestion.currentFtp,
  suggested: suggestion.newFtp,
  basis: `95% of your best 20 minutes (${Math.round(suggestion.bestTwentyMinW)} W) in that ride.`,
  note: `95% of 20-min best (${Math.round(suggestion.bestTwentyMinW)} W)${rideSuffix(suggestion.name)}`,
});

export const lthrPrompt = (suggestion: LthrSuggestion): ThresholdPrompt => {
  const avgHr = Math.round(suggestion.avgHr);
  return {
    kind: 'lthr',
    activityId: suggestion.activityId,
    name: suggestion.name,
    date: suggestion.date,
    current: suggestion.currentLthr,
    suggested: suggestion.newLthr,
    basis: `95% of your average heart rate (${avgHr} bpm) during that ride’s best 20 minutes of power.`,
    note: `95% of HR (${avgHr} bpm) in best 20-min power${rideSuffix(suggestion.name)}`,
  };
};

/** "212 W", "160 bpm". */
export const formatThreshold = (kind: ThresholdKind, value: number) => `${value} ${THRESHOLD_LABELS[kind].unit}`;

/** "+13 W", or null when there's nothing to compare with. */
export const riseText = (prompt: ThresholdPrompt): string | null => {
  if (prompt.current === null) return null;
  return `+${formatThreshold(prompt.kind, prompt.suggested - prompt.current)}`;
};

/** "Sisäpyöräily · 9.11.2026". */
export const rideLabel = (prompt: ThresholdPrompt): string => {
  const date = formatDate(prompt.date);
  return prompt.name ? `${prompt.name} · ${date}` : date;
};

/** The settings save that adds the new value from the ride's date. */
export const acceptInput = (prompt: ThresholdPrompt): SaveSettingInput => {
  const base = { from: prompt.date, source: 'estimated' as const, note: prompt.note };
  if (prompt.kind === 'ftp') return { kind: 'ftp', entry: { ...base, watts: prompt.suggested } };
  return { kind: 'lthr', entry: { ...base, bpm: prompt.suggested } };
};
