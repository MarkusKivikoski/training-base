export type SettingKind = 'ftp' | 'lthr' | 'weight';

/** The order of the history cards. */
export const SETTING_KINDS: readonly SettingKind[] = ['ftp', 'lthr', 'weight'];

export type SettingKindInfo = {
  title: string;
  /** Short name for the table header and the remove prompt. */
  short: string;
  unit: string;
  /** Label of the value field. */
  label: string;
  min: number;
  max: number;
  /** Whether the value must be a whole number. */
  isWhole: boolean;
  /** Placeholder of the note field. */
  notePlaceholder: string;
};

/** Limits match the API's validation. */
export const SETTING_KIND_INFO: Record<SettingKind, SettingKindInfo> = {
  ftp: {
    title: 'FTP',
    short: 'FTP',
    unit: 'W',
    label: 'Watts',
    min: 30,
    max: 2000,
    isWhole: true,
    notePlaceholder: 'e.g. 20-min test',
  },
  lthr: {
    title: 'Lactate threshold heart rate',
    short: 'LTHR',
    unit: 'bpm',
    label: 'bpm',
    min: 80,
    max: 230,
    isWhole: true,
    notePlaceholder: '',
  },
  weight: {
    title: 'Weight',
    short: 'Weight',
    unit: 'kg',
    label: 'kg',
    min: 20,
    max: 300,
    isWhole: false,
    notePlaceholder: '',
  },
};

/** The heatmap privacy trim is at most this many metres (matches the API). */
export const MAX_PRIVACY_TRIM_M = 5000;
