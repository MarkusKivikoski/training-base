import { weightOnDate } from './powerProfile.js';

export interface FtpPerKgPoint {
  date: string;
  /** FTP ÷ weight on that date, W/kg. */
  wattsPerKg: number;
  ftp: number;
  kg: number;
}

/** The FTP entry in effect on a date (never back-dated). */
function ftpEntryOn(history: ReadonlyArray<{ from: string; watts: number }>, date: string) {
  let current: { from: string; watts: number } | null = null;
  for (const entry of history) {
    const isLater = current === null || entry.from > current.from;
    if (entry.from <= date && isLater) current = entry;
  }
  return current;
}

/** The earliest start date in a history. */
function firstDate(history: ReadonlyArray<{ from: string }>): string {
  let first = history[0]!.from;
  for (const entry of history) if (entry.from < first) first = entry.from;
  return first;
}

/**
 * FTP per kg each time the FTP or the weight changes, from the first FTP entry on. The FTP is the
 * entry in effect on each date (never back-dated); weight uses weightOnDate, so the earliest
 * entry also applies before it. Empty without an FTP or a weight.
 */
export function ftpPerKgSeries(
  ftpHistory: ReadonlyArray<{ from: string; watts: number }>,
  weightHistory: ReadonlyArray<{ from: string; kg: number }>,
): FtpPerKgPoint[] {
  if (ftpHistory.length === 0 || weightHistory.length === 0) return [];
  const firstFtpDate = firstDate(ftpHistory);
  const changeDates = [...new Set([...ftpHistory, ...weightHistory].map((entry) => entry.from))]
    .filter((date) => date >= firstFtpDate)
    .sort();

  const points: FtpPerKgPoint[] = [];
  for (const date of changeDates) {
    const ftp = ftpEntryOn(ftpHistory, date);
    const kg = weightOnDate(weightHistory, date);
    if (!ftp || !kg) continue;
    points.push({ date, wattsPerKg: ftp.watts / kg, ftp: ftp.watts, kg });
  }
  return points;
}
