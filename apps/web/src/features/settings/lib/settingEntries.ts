import { addDays } from '@app/metrics';
import type { CurrentSettings, SyncJobStatus } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/formatters';
import type { SaveSettingInput } from '@/shared/api/settings';
import { MAX_PRIVACY_TRIM_M, SETTING_KIND_INFO, type SettingKind } from '../constants';

/** One effective-dated entry of any setting, with its value in that setting's unit. */
export type SettingEntry = {
  from: string;
  value: number;
  source?: 'manual' | 'estimated' | undefined;
  note?: string | undefined;
};

const historyOf = (settings: CurrentSettings, kind: SettingKind): SettingEntry[] => {
  if (kind === 'ftp') {
    return settings.ftpHistory.map((entry) => ({
      from: entry.from,
      value: entry.watts,
      source: entry.source,
      note: entry.note,
    }));
  }
  if (kind === 'lthr') {
    return settings.lthrHistory.map((entry) => ({
      from: entry.from,
      value: entry.bpm,
      source: entry.source,
      note: entry.note,
    }));
  }
  return settings.weightHistory.map((entry) => ({ from: entry.from, value: entry.kg, note: entry.note }));
};

/** A setting's history, oldest first. */
export const settingEntries = (settings: CurrentSettings, kind: SettingKind): SettingEntry[] =>
  historyOf(settings, kind).sort((first, second) => first.from.localeCompare(second.from));

/** "27.10.2026 – today", or up to the day before the next entry. `entries` are oldest first. */
export const effectiveRange = (entry: SettingEntry, entries: readonly SettingEntry[]): string => {
  const next = entries.find((other) => other.from > entry.from);
  const end = next ? formatDate(addDays(next.from, -1)) : 'today';
  return `${formatDate(entry.from)} – ${end}`;
};

/** The entry in effect today, if any. `entries` are oldest first. */
export const currentEntry = (entries: readonly SettingEntry[], today: string): SettingEntry | undefined =>
  [...entries].reverse().find((entry) => entry.from <= today);

/** The typed value as a number, or null if it isn't valid for the setting. Accepts a decimal comma. */
export const parseSettingValue = (text: string, kind: SettingKind): number | null => {
  if (text.trim() === '') return null;
  const info = SETTING_KIND_INFO[kind];
  const value = Number(text.replace(',', '.'));
  const isInRange = Number.isFinite(value) && value >= info.min && value <= info.max;
  if (!isInRange) return null;
  if (info.isWhole && !Number.isInteger(value)) return null;
  return value;
};

type EntryDraft = { from: string; value: number; note: string; isEstimated: boolean };

/** The API's save input for a new or replaced entry. */
export const saveInput = (kind: SettingKind, draft: EntryDraft): SaveSettingInput => {
  const note = draft.note.trim();
  const extra = note ? { note } : {};
  if (kind === 'ftp') return { kind, entry: { from: draft.from, watts: draft.value, source: 'manual', ...extra } };
  if (kind === 'lthr') {
    const source = draft.isEstimated ? 'estimated' : 'manual';
    return { kind, entry: { from: draft.from, bpm: draft.value, source, ...extra } };
  }
  return { kind, entry: { from: draft.from, kg: draft.value, ...extra } };
};

/** Whether a typed privacy trim is a whole number of metres in range. */
export const isValidPrivacyTrim = (metres: number) =>
  Number.isInteger(metres) && metres >= 0 && metres <= MAX_PRIVACY_TRIM_M;

/** What the settings page says about the background recompute, '' when there's nothing to say. */
export const rebuildStatusText = (job: SyncJobStatus | undefined): string => {
  if (!job) return '';
  const isRecomputing = job.state === 'running' && (job.kind === 'rebuild' || job.rebuildQueued);
  if (isRecomputing) return 'Recomputing now…';
  if (job.state === 'succeeded' && job.kind === 'rebuild') return 'Stats are up to date.';
  return '';
};
