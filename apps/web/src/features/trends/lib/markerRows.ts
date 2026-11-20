import type { Trends } from '@/shared/api/client';
import type { MarkerRow } from '@/shared/charts/markers/MarkerCard';
import { formatDate, formatHeartRate, formatPower } from '@/shared/lib/formatters';

/**
 * Set FTP entries and eFTP estimates in one list, oldest first. Sorted by ISO date before
 * formatting, because d.m.yyyy strings don't sort chronologically.
 */
export const ftpRows = (ftp: Trends['ftp']): MarkerRow[] => {
  const dated: Array<{ date: string; row: MarkerRow }> = [
    ...ftp.manual.map((entry) => ({
      date: entry.from,
      row: [`${formatDate(entry.from)} · set`, formatPower(entry.watts)] as MarkerRow,
    })),
    ...ftp.eftp.map((estimate) => ({
      date: estimate.date,
      row: [`${formatDate(estimate.date)} · eFTP`, formatPower(estimate.watts)] as MarkerRow,
    })),
  ];
  dated.sort((first, second) => first.date.localeCompare(second.date));
  return dated.map(({ row }) => row);
};

/**
 * One row per year with the best 5 s and the highest single reading, newest year first. The
 * card shows its rows reversed, so its list starts from the oldest year.
 */
export const maxHrRows = (years: Trends['maxHr']): MarkerRow[] =>
  [...years].reverse().map((year) => {
    const peak = year.peakBpm ? ` · single reading ${year.peakBpm}` : '';
    return [String(year.year), `${formatHeartRate(year.bpm)}${peak}`];
  });
