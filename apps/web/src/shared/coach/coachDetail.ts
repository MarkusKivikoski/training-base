import { HR_ZONES, POWER_ZONES, type Zone } from '@app/metrics';
import type { Activity, ActivityStreams } from '@/shared/api/client';
import { formatClock } from '@/shared/lib/formatters';
import { minuteAverages, type MinuteRow } from '@/shared/lib/minuteAverages';
import { totalZoneSeconds, zoneRows, type ZoneSet } from '@/shared/lib/zoneRows';

const MINUTE_CHANNELS = [
  { key: 'power', column: 'power_w' },
  { key: 'hr', column: 'hr_bpm' },
] as const;

type MinuteChannelKey = (typeof MINUTE_CHANNELS)[number]['key'];

/** Per-minute power and heart rate for the coach, with the channels the ride actually recorded. */
export type CoachMinutes = {
  channels: readonly MinuteChannelKey[];
  rows: readonly MinuteRow[];
};

const hasReadings = (values: readonly (number | null)[] | null | undefined): boolean =>
  Boolean(values?.some((value) => value !== null && value > 0));

/** One-minute averages of power and heart rate, or null when the ride has neither. */
export const coachMinutes = (stream: ActivityStreams): CoachMinutes | null => {
  const channels = MINUTE_CHANNELS.filter((channel) => hasReadings(stream[channel.key])).map((channel) => channel.key);
  if (channels.length === 0) return null;

  const rows = minuteAverages(
    stream.time,
    channels.map((key) => ({ key })),
    (key) => stream[key],
  );
  return { channels, rows };
};

/** The minutes as CSV, which a coaching chat reads reliably; minutes with no readings are left out. */
export const minuteLines = ({ channels, rows }: CoachMinutes): string[] => {
  const columns = channels.map((key) => MINUTE_CHANNELS.find((channel) => channel.key === key)?.column ?? key);
  const lines = [
    'Per-minute averages (CSV, minute = elapsed minutes from the start):',
    ['minute', ...columns].join(','),
  ];

  for (const { minute, averages } of rows) {
    const hasAnyReading = averages.some((average) => average !== null);
    if (!hasAnyReading) continue;
    const cells = averages.map((average) => (average === null ? '' : String(Math.round(average))));
    lines.push([minute, ...cells].join(','));
  }
  return lines;
};

const zoneSetLines = (title: string, set: ZoneSet, zones: readonly Zone[], unit: string): string[] => {
  if (totalZoneSeconds(set) === 0) return [];
  const lines = [`${title} (${set.threshold} ${unit}):`];
  for (const row of zoneRows(set, zones)) {
    // A zone that rounds to 0% tells the coach nothing and costs tokens.
    const isNegligible = Math.round(row.percent) === 0;
    if (isNegligible) continue;
    lines.push(
      `- Z${row.number} ${row.name} (${row.range} ${unit}): ${formatClock(row.seconds)} (${Math.round(row.percent)}%)`,
    );
  }
  return lines;
};

/** Time in power zones and heart-rate zones, whichever the ride has. */
export const zoneLines = (zones: Activity['zones']): string[] => {
  const powerLines = zones.power ? zoneSetLines('Time in power zones, FTP', zones.power, POWER_ZONES, 'W') : [];
  const hrLines = zones.hr ? zoneSetLines('Time in heart-rate zones, LTHR', zones.hr, HR_ZONES, 'bpm') : [];
  return [...powerLines, ...hrLines];
};
