import { rangeStats } from '@app/metrics';
import type { ActivityStreams } from '@/shared/api/client';
import { formatClock, formatHeartRate, formatPower } from '@/shared/lib/formatters';
import type { DraftCheck } from './intervalEdits';
import { percentOfFtp } from './rideIntervals';

/** "interval 3", "intervals 2 and 3", "intervals 2, 3 and 4" from 0-based indices. */
export const intervalNumbersText = (indices: readonly number[]): string => {
  const numbers = indices.map((index) => String(index + 1));
  if (numbers.length === 1) return `interval ${numbers[0]}`;
  const allButLast = numbers.slice(0, -1).join(', ');
  return `intervals ${allButLast} and ${numbers.at(-1)}`;
};

/**
 * One line on the draft: what is wrong with it, or the interval it would save (length, power,
 * share of FTP, heart rate) and which intervals it would replace. Null while it is incomplete.
 */
export const draftSummary = (check: DraftCheck | null, stream: ActivityStreams, ftp: number | null): string | null => {
  if (check === null || check.status === 'incomplete') return null;
  if (check.status === 'invalid') return check.message;

  const stats = rangeStats(stream, check.range);
  const parts = [formatClock(stats.durationS)];
  if (stats.avgPower !== null) parts.push(`${formatPower(stats.avgPower)} avg`);
  const ftpShare = percentOfFtp(stats.avgPower, ftp);
  if (ftpShare) parts.push(`${ftpShare} of FTP`);
  if (stats.avgHr !== null) parts.push(formatHeartRate(stats.avgHr));
  if (check.replaces.length > 0) parts.push(`replaces ${intervalNumbersText(check.replaces)}`);
  return parts.join(' · ');
};
