import { describe, expect, it } from 'vitest';
import type { CurrentSettings, SyncJobStatus } from '@/shared/api/client';
import {
  currentEntry,
  effectiveRange,
  isValidPrivacyTrim,
  parseSettingValue,
  rebuildStatusText,
  saveInput,
  settingEntries,
  type SettingEntry,
} from './settingEntries';

const settings = {
  ftpHistory: [
    { from: '2026-10-27', watts: 199, source: 'manual', note: 'Test' },
    { from: '2026-06-01', watts: 185, source: 'manual' },
  ],
  lthrHistory: [],
  weightHistory: [{ from: '2026-01-01', kg: 84.5 }],
} as unknown as CurrentSettings;

describe('setting entries', () => {
  it('maps each history to entries, oldest first', () => {
    expect(settingEntries(settings, 'ftp').map((entry) => [entry.from, entry.value])).toEqual([
      ['2026-06-01', 185],
      ['2026-10-27', 199],
    ]);
    expect(settingEntries(settings, 'weight')[0]).toEqual({ from: '2026-01-01', value: 84.5, note: undefined });
  });

  it('shows when each entry applies and which is current', () => {
    const entries: SettingEntry[] = [
      { from: '2026-06-01', value: 185 },
      { from: '2026-10-27', value: 199 },
      { from: '2026-12-01', value: 205 },
    ];
    expect(effectiveRange(entries[0]!, entries)).toBe('1.6.2026 – 26.10.2026');
    expect(effectiveRange(entries[2]!, entries)).toBe('1.12.2026 – today');
    expect(currentEntry(entries, '2026-11-09')?.value).toBe(199);
    expect(currentEntry(entries, '2026-01-01')).toBeUndefined();
  });

  it('validates typed values per setting', () => {
    expect(parseSettingValue('199', 'ftp')).toBe(199);
    expect(parseSettingValue('199.5', 'ftp')).toBeNull();
    expect(parseSettingValue('84,5', 'weight')).toBe(84.5);
    expect(parseSettingValue('10', 'weight')).toBeNull();
    expect(parseSettingValue(' ', 'lthr')).toBeNull();
  });

  it('builds the save input', () => {
    expect(saveInput('ftp', { from: '2026-11-09', value: 200, note: ' ', isEstimated: false })).toEqual({
      kind: 'ftp',
      entry: { from: '2026-11-09', watts: 200, source: 'manual' },
    });
    expect(saveInput('lthr', { from: '2026-11-09', value: 155, note: 'Hard ride', isEstimated: true })).toEqual({
      kind: 'lthr',
      entry: { from: '2026-11-09', bpm: 155, source: 'estimated', note: 'Hard ride' },
    });
  });

  it('checks the privacy trim and describes the recompute', () => {
    expect(isValidPrivacyTrim(200)).toBe(true);
    expect(isValidPrivacyTrim(5001)).toBe(false);
    expect(isValidPrivacyTrim(1.5)).toBe(false);
    expect(rebuildStatusText({ state: 'running', kind: 'rebuild' } as SyncJobStatus)).toBe('Recomputing now…');
    expect(rebuildStatusText({ state: 'succeeded', kind: 'rebuild' } as SyncJobStatus)).toBe('Stats are up to date.');
    expect(rebuildStatusText(undefined)).toBe('');
  });
});
